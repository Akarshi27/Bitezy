import pandas as pd
from typing import Dict, Any, List
from .data_loader import get_data, get_customer, sanitize_json_obj
from .decision import decide
from .constraints import check_merchant_open, check_distance, check_stock, check_consent
from eval.evaluator import evaluate

def compute_baseline_analytics() -> Dict[str, Any]:
    data = get_data()
    scenarios_df = pd.read_csv(data['DATA_DIR'] if hasattr(data, 'DATA_DIR') else 'data/scenarios_public.csv')
    merchants_df = pd.read_csv('data/merchants.csv')
    customers_df = pd.read_csv('data/customers.csv')

    merchants_dict = data['merchants']
    scenarios_list = scenarios_df.to_dict(orient='records')

    # Policy 1: Proposed AI Decision Engine
    engine_preds = {}
    for sc in scenarios_list:
        engine_preds[sc['id']] = decide(sc)
    
    engine_summary, _ = evaluate(engine_preds, scenarios_df, merchants_df, customers_df)

    # Policy 2: Baseline No-Offer (Control)
    no_offer_preds = {}
    for sc in scenarios_list:
        no_offer_preds[sc['id']] = {
            'scenario_id': sc['id'],
            'action': 'skip',
            'reason': 'Baseline No-Offer Control policy'
        }
    no_offer_summary, _ = evaluate(no_offer_preds, scenarios_df, merchants_df, customers_df)

    # Policy 3: Baseline Fixed 10% Discount
    fixed_10_preds = {}
    for sc in scenarios_list:
        m_id = sc.get('merchant_id')
        if m_id in merchants_dict:
            m = merchants_dict[m_id]
            items = data['merchant_catalog'].get(m_id, [])
            in_stock = check_stock(items)
            if in_stock:
                item = in_stock[0]
                price = item.get('price_inr', 100)
                final_price = round(price * 0.9, 2)
                fixed_10_preds[sc['id']] = {
                    'scenario_id': sc['id'],
                    'action': 'send',
                    'offer': {
                        'merchant_id': m_id,
                        'discount_pct': 10,
                        'item_id': item['id'],
                        'final_price_inr': final_price,
                        'valid_minutes': 30
                    },
                    'notification': {
                        'title': f"Offer at {m['name']}",
                        'body': f"Visit {m['name']} for {item['title']} at ₹{final_price}.",
                        'language': 'en',
                        'cta': 'Grab it'
                    },
                    'profit_estimate_inr': round(final_price - m.get('unit_cost_inr', 50), 2)
                }
            else:
                fixed_10_preds[sc['id']] = {'scenario_id': sc['id'], 'action': 'skip', 'reason': 'Out of stock'}
        else:
            fixed_10_preds[sc['id']] = {'scenario_id': sc['id'], 'action': 'skip', 'reason': 'Merchant not found'}

    fixed_10_summary, _ = evaluate(fixed_10_preds, scenarios_df, merchants_df, customers_df)

    # Policy 4: Baseline Blanket Max Discount
    blanket_max_preds = {}
    for sc in scenarios_list:
        m_id = sc.get('merchant_id')
        if m_id in merchants_dict:
            m = merchants_dict[m_id]
            items = data['merchant_catalog'].get(m_id, [])
            in_stock = check_stock(items)
            if in_stock:
                item = in_stock[0]
                max_disc = float(m.get('max_discount_pct', 20))
                price = item.get('price_inr', 100)
                final_price = round(price * (1 - max_disc / 100.0), 2)
                blanket_max_preds[sc['id']] = {
                    'scenario_id': sc['id'],
                    'action': 'send',
                    'offer': {
                        'merchant_id': m_id,
                        'discount_pct': max_disc,
                        'item_id': item['id'],
                        'final_price_inr': final_price,
                        'valid_minutes': 30
                    },
                    'notification': {
                        'title': f"Max Discount at {m['name']}",
                        'body': f"Save {max_disc}% at {m['name']} on {item['title']} for ₹{final_price}.",
                        'language': 'en',
                        'cta': 'Grab it'
                    },
                    'profit_estimate_inr': round(final_price - m.get('unit_cost_inr', 50), 2)
                }
            else:
                blanket_max_preds[sc['id']] = {'scenario_id': sc['id'], 'action': 'skip', 'reason': 'Out of stock'}
        else:
            blanket_max_preds[sc['id']] = {'scenario_id': sc['id'], 'action': 'skip', 'reason': 'Merchant not found'}

    blanket_max_summary, _ = evaluate(blanket_max_preds, scenarios_df, merchants_df, customers_df)

    # Calculate financial aggregations for engine vs baselines
    def calc_finances(preds: dict):
        total_send = 0
        total_skip = 0
        total_discount_spent = 0.0
        total_estimated_profit = 0.0
        
        for p in preds.values():
            if p.get('action') == 'send':
                total_send += 1
                offer = p.get('offer') or {}
                m_id = offer.get('merchant_id')
                m = merchants_dict.get(m_id, {})
                base_price = float(m.get('base_price_inr', 200))
                final_price = float(offer.get('final_price_inr', base_price))
                total_discount_spent += max(0, base_price - final_price)
                if p.get('profit_estimate_inr') is not None:
                    total_estimated_profit += float(p['profit_estimate_inr'])
            else:
                total_skip += 1

        return {
            'offers_sent': total_send,
            'offers_skipped': total_skip,
            'total_discount_spent_inr': round(total_discount_spent, 2),
            'total_estimated_profit_inr': round(total_estimated_profit, 2)
        }

    return sanitize_json_obj({
        'proposed_engine': {
            'name': 'Proposed AI Decision Engine',
            'summary': engine_summary,
            'economics': calc_finances(engine_preds)
        },
        'baseline_no_offer': {
            'name': 'Baseline No-Offer (Control)',
            'summary': no_offer_summary,
            'economics': calc_finances(no_offer_preds)
        },
        'baseline_fixed_10': {
            'name': 'Baseline Fixed 10% Discount',
            'summary': fixed_10_summary,
            'economics': calc_finances(fixed_10_preds)
        },
        'baseline_blanket_max': {
            'name': 'Baseline Blanket Max Discount',
            'summary': blanket_max_summary,
            'economics': calc_finances(blanket_max_preds)
        }
    })
