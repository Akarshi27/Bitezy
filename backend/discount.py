import pandas as pd
from .constraints import check_margin

def optimize_discount(customer: dict, merchant: dict, item: dict, dist_m: float) -> dict:
    max_discount = merchant.get('max_discount_pct', 0.0)
    if pd.isna(max_discount): max_discount = 0.0
    
    levels = [0, 25, 50, 75, 100]
    
    best_expected_contribution = -float('inf')
    best_discount = 0.0
    best_final_price = item.get('price_inr', 0.0)
    best_contribution = 0.0
    best_acc_prob = 0.0
    
    unit_cost = merchant.get('unit_cost_inr', 0.0)
    base_price = merchant.get('base_price_inr', item.get('price_inr', 0.0))
    min_margin = merchant.get('min_margin_pct', 0.0)
    
    dist_factor = max(0, 1.0 - dist_m / 1500.0)
    
    prefs = customer.get('declared_preferences', '')
    pref_match = 1.0 if pd.notna(prefs) and str(merchant.get('category', '')) in str(prefs) else 0.0
    
    occ = merchant.get('occupancy_pct', 100)
    if pd.isna(occ): occ = 100
    
    for level in levels:
        candidate_pct = float(max_discount * level / 100.0)
        
        passed_margin, _, final_price_base = check_margin(base_price, unit_cost, min_margin, candidate_pct)
        # Evaluator checks margin softly against base price, but we should make sure we're profitable on the item
        final_price_item = item.get('price_inr', 0.0) * (1 - candidate_pct / 100.0)
        
        if not passed_margin:
            continue
            
        contribution = final_price_item - unit_cost
        
        discount_factor = candidate_pct / max_discount if max_discount > 0 else 0
        
        acceptance_prob = 0.25 + (discount_factor * 0.3) + (dist_factor * 0.2) + (pref_match * 0.15) + ((1 - occ/100.0) * 0.1)
        expected_contribution = contribution * acceptance_prob
        
        if expected_contribution > best_expected_contribution:
            best_expected_contribution = expected_contribution
            best_discount = candidate_pct
            best_final_price = final_price_item
            best_contribution = contribution
            best_acc_prob = acceptance_prob
            
    if best_expected_contribution == -float('inf'):
        # Fallback if none pass margin
        best_discount = 0.0
        best_final_price = item.get('price_inr', 0.0)
        best_contribution = best_final_price - unit_cost
        best_acc_prob = 0.25 + (dist_factor * 0.2) + (pref_match * 0.15) + ((1 - occ/100.0) * 0.1)
        
    return {
        'discount_pct': round(best_discount, 2),
        'final_price_inr': round(best_final_price, 2),
        'contribution': best_contribution,
        'acceptance_prob': best_acc_prob,
        'profit_estimate_inr': round(best_contribution * best_acc_prob, 2)
    }
