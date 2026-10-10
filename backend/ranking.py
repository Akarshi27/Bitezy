import pandas as pd
from typing import List, Dict, Tuple
from .embeddings import get_semantic_score
from .model_scorer import extract_features, score_candidate_ml

def score_merchant_item(customer: dict, merchant: dict, item: dict, dist_m: float, scenario: dict, active_festivals: List[dict]) -> Tuple[float, float, float]:
    score = 0.0
    
    # 1. Category preference match
    prefs = customer.get('declared_preferences', '')
    cat_match = False
    if pd.notna(prefs) and str(merchant.get('category', '')) in str(prefs):
        score += 25.0
        cat_match = True
        
    # 2. Distance score (linear decay, 0m=25pts, 1500m=0pts)
    dist_score = max(0, 25.0 * (1 - dist_m / 1500.0))
    score += dist_score
    
    # 3. Occupancy headroom
    occ = merchant.get('occupancy_pct', 100)
    if pd.isna(occ): occ = 100
    score += (100 - occ) / 100.0 * 10.0
    
    # 4. Inventory signal
    inv_signal = merchant.get('inventory_signal', '')
    if inv_signal == 'surplus':
        score += 5.0
    elif inv_signal == 'low':
        score -= 5.0
        
    # 5. Festival boost
    for fest in active_festivals:
        cats_str = fest.get('categories', '')
        if pd.notna(cats_str) and str(merchant.get('category', '')) in str(cats_str):
            boost = fest.get('boost_pct', 0)
            if pd.notna(boost):
                score += boost * 0.2
                
    # 6. Time match
    intent = scenario.get('intent', '')
    if pd.notna(intent) and 'lunch' in str(intent).lower():
        cat = str(merchant.get('category', '')).lower()
        if cat in ['restaurant', 'cafe']:
            score += 10.0

    # 7. Semantic Embedding Similarity (Hugging Face / Vector Similarity)
    semantic_sim = get_semantic_score(
        intent=str(intent) if pd.notna(intent) else '',
        preferences=str(prefs) if pd.notna(prefs) else '',
        item_title=str(item.get('title', '')),
        item_tags=str(item.get('tags', '')),
        merchant_category=str(merchant.get('category', ''))
    )
    score += semantic_sim * 15.0
            
    # 8. PyTorch Tabular Model Score
    churn = customer.get('churn_risk', 0.5)
    if pd.isna(churn): churn = 0.5
    
    price = item.get('price_inr', 100)
    budget = customer.get('wallet_inr', 500)
    if pd.isna(budget): budget = 500.0

    feats = extract_features(
        semantic_sim=semantic_sim,
        dist_m=dist_m,
        max_dist_m=float(scenario.get('max_distance_m', 1500)),
        price=float(price),
        budget=float(budget),
        occupancy_pct=float(occ),
        churn_risk=float(churn),
        min_margin_pct=float(merchant.get('min_margin_pct', 10)),
        unit_cost=float(merchant.get('unit_cost_inr', 50)),
        category_match=cat_match
    )
    ml_prob = score_candidate_ml(feats)
    score += ml_prob * 10.0

    # 9. Churn uplift
    score += float(churn) * 8.0
    
    # 10. Price fit
    if price > 0:
        pf = min(budget / price, 1.0) * 5.0
        score += pf
        
    return score, semantic_sim, ml_prob


