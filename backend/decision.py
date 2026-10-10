from datetime import datetime
import pandas as pd
from dateutil.parser import parse

from .data_loader import get_data, get_customer
from .constraints import (
    check_consent, check_merchant_open, check_promo_window, 
    check_distance, check_stock, check_budget, check_time_feasibility
)
from .ranking import score_merchant_item
from .discount import optimize_discount
from .notification import generate_notification

def decide(scenario: dict) -> dict:
    data = get_data()
    
    # 1. Extract context
    c_id = scenario.get('customer_id')
    m_id = scenario.get('merchant_id')
    
    # 2. Get customer
    customer = get_customer(c_id)
    if pd.notna(scenario.get('wallet_override')):
        customer['wallet_inr'] = float(scenario['wallet_override'])
        
    # 3. Get merchant
    if m_id not in data['merchants']:
        return {"scenario_id": scenario['id'], "action": "skip", "reason": f"Merchant {m_id} not found."}
    merchant = data['merchants'][m_id]
    
    # 4. Get scenario weather
    scenario_dt = parse(scenario['timestamp'])
    
    # 5. Get active festivals
    active_fests = []
    for f in data['festivals']:
        f_start = parse(str(f['start_date'])).date()
        f_end = parse(str(f['end_date'])).date()
        if f_start <= scenario_dt.date() <= f_end:
            active_fests.append(f)
            
    # 6. Hard constraints
    # - consent
    passed, reason = check_consent(customer)
    if not passed: return {"scenario_id": scenario['id'], "action": "skip", "reason": reason}
    
    # - merchant open
    passed, reason = check_merchant_open(merchant, scenario_dt)
    if not passed: return {"scenario_id": scenario['id'], "action": "skip", "reason": reason}
    
    # - promo window
    passed, reason = check_promo_window(merchant, scenario_dt)
    if not passed: return {"scenario_id": scenario['id'], "action": "skip", "reason": reason}
    
    # - distance
    c_lat = float(scenario['lat'])
    c_lng = float(scenario['lng'])
    m_lat = float(merchant['lat'])
    m_lng = float(merchant['lng'])
    
    passed, reason, dist_m = check_distance(c_lat, c_lng, m_lat, m_lng, max_m=1500)
    if not passed: return {"scenario_id": scenario['id'], "action": "skip", "reason": reason}
    
    walk_minutes = int(dist_m / 80.0)
    
    # 7. Catalog items
    items = data['merchant_catalog'].get(m_id, [])
    items = check_stock(items)
    
    # 9. If no items
    if not items:
        return {"scenario_id": scenario['id'], "action": "skip", "reason": "No items in stock."}
        
    # 10. Score and rank items
    best_item = None
    best_score = -float('inf')
    for item in items:
        # Quick budget filter
        max_disc = merchant.get('max_discount_pct', 0)
        if pd.isna(max_disc): max_disc = 0
        min_possible_price = item.get('price_inr', 0) * (1 - float(max_disc)/100.0)
        
        wallet = customer.get('wallet_inr')
        if pd.notna(wallet) and min_possible_price > wallet:
            continue
            
        passed_time, time_reason = check_time_feasibility(
            walk_minutes, 
            item.get('prep_minutes', 0), 
            scenario.get('minutes_available')
        )
        if not passed_time:
            continue
            
        score, sim = score_merchant_item(customer, merchant, item, dist_m, scenario, active_fests)
        if score > best_score:
            best_score = score
            best_sim = sim
            best_item = item
            
    if not best_item:
        return {"scenario_id": scenario['id'], "action": "skip", "reason": "No feasible items under budget/time constraints."}
        
    # 12. Optimize discount
    opt_res = optimize_discount(customer, merchant, best_item, dist_m)
    
    # Validate final price vs wallet strictly
    wallet = customer.get('wallet_inr')
    if pd.notna(wallet) and opt_res['final_price_inr'] > wallet:
        return {"scenario_id": scenario['id'], "action": "skip", "reason": "Best discount price exceeds wallet."}
        
    # 13. Generate notification
    weather_cond = scenario.get('condition', 'clear')
    weather_temp = scenario.get('temp_c', 25)
    weather_note = f"{weather_cond}, {weather_temp}°C"
    
    notif = generate_notification(
        merchant, best_item, opt_res['discount_pct'], opt_res['final_price_inr'], 
        walk_minutes, weather_note, customer.get('language', 'en'), scenario
    )
    
    # 14. Build response
    return {
        "scenario_id": scenario['id'],
        "action": "send",
        "reason": f"Selected item {best_item['id']} with {opt_res['discount_pct']}% discount.",
        "offer": {
            "merchant_id": m_id,
            "discount_pct": opt_res['discount_pct'],
            "item_id": best_item['id'],
            "final_price_inr": opt_res['final_price_inr'],
            "valid_minutes": 30
        },
        "notification": notif,
        "ui_hints": {
            "distance_m": int(dist_m),
            "walk_minutes": walk_minutes,
            "weather_note": weather_note
        },
        "profit_estimate_inr": opt_res['profit_estimate_inr'],
        "decision_trace": {
            "consent_check": {"passed": True},
            "merchant_open_check": {"passed": True},
            "promo_window_check": {"passed": True},
            "distance_check": {"passed": True, "distance_m": round(dist_m, 1), "walk_minutes": walk_minutes},
            "selected_item_id": best_item['id'],
            "ranking_score": round(best_score, 2),
            "semantic_similarity": round(best_sim, 3),
            "optimal_discount_pct": opt_res['discount_pct'],
            "expected_profit_inr": opt_res['profit_estimate_inr']
        }
    }

