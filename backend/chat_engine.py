import re
from typing import Dict, Any, List, Tuple
from datetime import datetime
import pandas as pd

from .data_loader import get_data, get_customer
from .decision import decide

MULTILINGUAL_TEXTS = {
  'en': {
    'greeting_no_offers': "I couldn't find any active food offers matching all your criteria right now.",
    'found_offers': "Here are the top ML-recommended food deals matching your craving!",
    'budget_exceeded': "Some great options were slightly above your budget. Try increasing your budget to ",
    'distance_exceeded': "No nearby cafes matched. Try increasing your search distance.",
    'closed': "The requested cafes are currently closed for orders.",
    'ml_explanation': "Matches your {pref} preference, ₹{budget} budget, and {walk} min walking distance ({ml_pct}% ML match).",
    'followup_prompt': "What type of food are you craving right now (e.g. South Indian, Cafe, Fast Food)?"
  },
  'hi-en': {
    'greeting_no_offers': "Aapke saare criteria se match hone waale offers abhi mil nahi paye.",
    'found_offers': "Yeh hain aapke taste aur budget ke mutabiq top ML-recommended deals!",
    'budget_exceeded': "Kuch achhe options aapke budget se thode upar hain. Budget badhayein: ",
    'distance_exceeded': "Aapke paas koi matching cafe nahi mila. Distance badhayein.",
    'closed': "Requested cafes abhi orders ke liye closed hain.",
    'ml_explanation': "Aapki {pref} craving, ₹{budget} budget aur {walk} min walk se perfect match ({ml_pct}% ML match).",
    'followup_prompt': "Aap abhi kya khana chahte hain (e.g. South Indian, Cafe, Fast Food)?"
  },
  'hi': {
    'greeting_no_offers': "आपकी सभी शर्तों से मेल खाने वाले ऑफ़र अभी उपलब्ध नहीं हैं।",
    'found_offers': "यहाँ आपकी पसंद और बजट के अनुसार शीर्ष ML-अनुशंसित ऑफ़र हैं!",
    'budget_exceeded': "कुछ बेहतरीन विकल्प आपके बजट से थोड़े ऊपर थे। अपना बजट बढ़ाएं: ",
    'distance_exceeded': "पास में कोई मेल खाता कैफ़े नहीं मिला। खोज दूरी बढ़ाएं।",
    'closed': "संबंधित कैफ़े वर्तमान में ऑर्डर के लिए बंद हैं।",
    'ml_explanation': "आपकी {pref} पसंद, ₹{budget} बजट और {walk} मिनट की पैदल दूरी से पूर्ण मेल ({ml_pct}% ML मैच)।",
    'followup_prompt': "आप अभी क्या खाना चाहते हैं (जैसे साउथ इंडियन, कैफ़े, फ़ास्ट फ़ूड)?"
  },
  'kn-en': {
    'greeting_no_offers': "Nimma ella niyama galige match aaguvudhu aafargaḷu sigalilla.",
    'found_offers': "Nimm nireekshege sariyada top ML-recommended deals ividive!",
    'budget_exceeded': "Kelavu olle options nimma budget gintha swalpa hechide. Budget hechisi: ",
    'distance_exceeded': "Hattiradalli yaavude cafe sigalilla. Distance hechisi.",
    'closed': "Ee cafes iaga open illa.",
    'ml_explanation': "Nimma {pref} choice, ₹{budget} budget mattu {walk} min nadige ge match aagide ({ml_pct}% ML match).",
    'followup_prompt': "Neevu iga enu thinnabeku ankondiddira (e.g. South Indian, Cafe, Fast Food)?"
  },
  'ta-en': {
    'greeting_no_offers': "Uṅgaḷ ella criteria-kum match aagura offers ippo illai.",
    'found_offers': "Uṅgaḷuḍaiya preference-ku etha top ML-recommended deals idho!",
    'budget_exceeded': "Sila nalla options uṅga budget-ai vida konjam adhigama irukku. Budget adhigariyungga: ",
    'distance_exceeded': "Pakkathula edhum cafe match aagala. Distance adhigariyungga.",
    'closed': "Intha cafes ippo closed-a irukku.",
    'ml_explanation': "Uṅga {pref} craving, ₹{budget} budget matrum {walk} min walk-ku semma match ({ml_pct}% ML match).",
    'followup_prompt': "Neenga ippo enna saapida poringa (e.g. South Indian, Cafe, Fast Food)?"
  },
  'te-en': {
    'greeting_no_offers': "Mee criteria anni match ayye offers ippudu levu.",
    'found_offers': "Mee preference ki thagga top ML-recommended deals ivigo!",
    'budget_exceeded': "Konnni manchi options mee budget kante koncham ekkuva unnai. Budget penchandi: ",
    'distance_exceeded': "Daggarlo ey cafe match kaledhu. Distance penchandi.",
    'closed': "Ee cafes ippudu closed lo unnai.",
    'ml_explanation': "Mee {pref} craving, ₹{budget} budget mariyu {walk} min nadaka ki perfect match ({ml_pct}% ML match).",
    'followup_prompt': "Meeru ippudu em thinalani anukuntunnaru (e.g. South Indian, Cafe, Fast Food)?"
  }
}

def extract_requirements(text: str, current_context: dict = None, language: str = 'en') -> dict:
    """
    Parses customer natural language query in English, Hindi, Hinglish, Kannada, Tamil, or Telugu.
    Extracts structured fields: food_preference, food_type, budget, max_distance_m, available_time.
    Preserves and refines existing conversational context.
    """
    ctx = dict(current_context) if current_context else {}
    txt = text.lower().strip()

    # 1. Food preference / cuisine extraction
    if any(k in txt for k in ['south_indian', 'south indian', 'dosa', 'idli', 'vada', 'sambar', 'thali', 'उत्तम', 'साउथ इंडियन', 'दौसा', 'इडली']):
        ctx['food_preference'] = 'south_indian'
    elif any(k in txt for k in ['fast_food', 'fast food', 'burger', 'pizza', 'fries', 'street food', 'फ़ास्ट फ़ूड', 'बर्गर']):
        ctx['food_preference'] = 'fast_food'
    elif any(k in txt for k in ['healthy', 'salad', 'juice', 'sprouts', 'हेल्दी', 'सलाद']):
        ctx['food_preference'] = 'healthy'
    elif any(k in txt for k in ['cafe', 'coffee', 'tea', 'beverage', 'snack', 'bakery', 'कैफ़े', 'कॉफ़ी', 'चाय']):
        ctx['food_preference'] = 'cafe'

    # 2. Dietary preference (veg / non-veg / both)
    if any(k in txt for k in ['veg', 'vegetarian', 'pure veg', 'शाकाहारी', 'ಸಸ್ಯಾಹಾರಿ', 'சைவம்']):
        if 'non veg' not in txt and 'non-veg' not in txt and 'nonveg' not in txt:
            ctx['food_type'] = 'veg'
    if any(k in txt for k in ['non-veg', 'non veg', 'nonveg', 'chicken', 'mutton', 'egg', 'fish', 'मांसाहारी', 'நானோ-வெஜ்']):
        ctx['food_type'] = 'non_veg'
    if any(k in txt for k in ['both', 'anything', 'any food', 'kuch bhi', 'कोई भी']):
        ctx['food_type'] = 'both'

    # 3. Budget extraction (inr)
    # Match patterns like: ₹150, 150 rs, 150 inr, under 150, 150 ke andar, 150 rupees, budget 150, 150/-
    budget_matches = re.findall(r'(?:₹|rs\.?|rupees|budget|under|below|andar|tak|रुपये|रूपये)?\s*(\d{2,4})\s*(?:₹|rs\.?|rupees|inr|/-|ke andar|tak|rupee)?', txt)
    if budget_matches:
        # Pick numbers that look like prices (50 to 5000)
        valid_nums = [float(n) for n in budget_matches if 40 <= float(n) <= 5000]
        if valid_nums:
            ctx['budget'] = valid_nums[0]

    # Handle budget incremental refinements like "increase budget to 200" or "budget 250"
    if 'budget' in txt or 'badao' in txt or 'increase' in txt or 'penchandi' in txt or 'adhigariyungga' in txt:
        nums = re.findall(r'\b(\d{2,4})\b', txt)
        if nums:
            valid = [float(n) for n in nums if 50 <= float(n) <= 5000]
            if valid:
                ctx['budget'] = valid[-1]

    # 4. Distance / Walk time extraction e.g. "10 min walk", "10 min walking distance"
    walk_match = re.search(r'(\d{1,2})\s*(?:min|minute|mins| मिनट|ನಿಮಿಷ|நிமிடம்)?\s*(?:walk|walking|walkable|pedal|naḍai|nadaka|nadige)', txt)
    if walk_match:
        walk_mins = float(walk_match.group(1))
        ctx['max_distance_m'] = int(walk_mins * 80.0)
    else:
        # Check explicit meters/km
        dist_m_match = re.search(r'(\d+(?:\.\d+)?)\s*(km|m|meter|meters)', txt)
        if dist_m_match:
            val = float(dist_m_match.group(1))
            unit = dist_m_match.group(2)
            if unit == 'km':
                ctx['max_distance_m'] = int(val * 1000.0)
            else:
                ctx['max_distance_m'] = int(val)

    # Relative distance refinements
    if any(k in txt for k in ['closer', 'nearer', 'paas', 'kam distance', 'hattira', 'pakkathula']):
        curr_dist = ctx.get('max_distance_m', 1500)
        ctx['max_distance_m'] = max(400, curr_dist - 300)

    # 5. Time available extraction e.g. "have only 25 minutes", "25 mins available"
    time_match = re.search(r'(?:only|have|time|left)?\s*(\d{1,2})\s*(?:min|minute|mins)\s*(?:available|left|time)?', txt)
    if time_match and not walk_match:
        ctx['available_time'] = int(time_match.group(1))

    return ctx

def process_customer_chat(
    customer_id: str,
    message: str,
    language: str = 'en',
    context: dict = None
) -> dict:
    """
    Main Chatbot Execution Pipeline:
    1. Parse NL message & update context.
    2. Iterate candidate merchants/offers.
    3. Invoke PyTorch Model & 10-Gate Decision Engine (`decide`).
    4. Rank eligible offers by ML probability.
    5. Construct multilingual assistant response and offer cards.
    """
    lang = language.lower() if language in MULTILINGUAL_TEXTS else 'en'
    texts = MULTILINGUAL_TEXTS.get(lang, MULTILINGUAL_TEXTS['en'])

    # 1. Update requirement context
    updated_context = extract_requirements(message, context, lang)
    
    # Ensure sensible defaults
    pref = updated_context.get('food_preference', 'anything')
    food_type = updated_context.get('food_type', 'both')
    budget = float(updated_context.get('budget', 300.0))
    max_dist = float(updated_context.get('max_distance_m', 1500.0))
    avail_time = int(updated_context.get('available_time', 30))

    # 2. Get customer & merchants
    data = get_data()
    customer = get_customer(customer_id)
    merchants = data.get('merchants', {})
    catalog = data.get('catalog', {})

    # 3. Evaluate each merchant scenario through PyTorch Model + 10-Gate Decision Engine
    eligible_results = []
    rejected_reasons = []

    timestamp_str = datetime.now().isoformat()

    for m_id, merchant in merchants.items():
        scenario = {
            'id': f"chat_{customer_id}_{m_id}_{int(datetime.now().timestamp())}",
            'customer_id': customer_id,
            'merchant_id': m_id,
            'lat': customer.get('current_lat', customer.get('home_lat', 12.93595)),
            'lng': customer.get('current_lng', customer.get('home_lng', 77.62484)),
            'timestamp': timestamp_str,
            'max_distance_m': max_dist,
            'food_type': food_type,
            'food_preference': pref,
            'budget': budget,
            'available_time': avail_time,
            'intent': message
        }

        result = decide(scenario)

        if result.get('action') == 'send' and 'offer' in result:
            offer_info = result['offer']
            item_id = offer_info['item_id']
            item_obj = catalog.get(item_id, {})
            
            trace = result.get('decision_trace', {})
            ml_prob = trace.get('ml_model_score', 0.85)
            ranking_score = trace.get('ranking_score', 50.0)
            walk_mins = trace.get('distance_check', {}).get('walk_minutes', 10)
            dist_m = trace.get('distance_check', {}).get('distance_m', 500)

            # Build offer card object
            card = {
                'offer_id': result.get('offer_id'),
                'scenario_id': result.get('scenario_id'),
                'merchant_id': m_id,
                'merchant_name': merchant.get('name', 'Partner Cafe'),
                'merchant_category': merchant.get('category', 'cafe'),
                'item_id': item_id,
                'item_name': item_obj.get('title', 'Special Item'),
                'item_image': item_obj.get('image_url', ''),
                'is_veg': item_obj.get('is_veg', 1),
                'original_price': item_obj.get('price_inr', 100),
                'discounted_price': offer_info.get('final_price_inr', 80),
                'discount_pct': offer_info.get('discount_pct', 20),
                'walk_minutes': walk_mins,
                'distance_m': int(dist_m),
                'ml_model_score': ml_prob,
                'ml_match_pct': int(round(ml_prob * 100)),
                'ranking_score': ranking_score,
                'explanation': texts['ml_explanation'].format(
                    pref=pref.replace('_', ' ').title(),
                    budget=int(budget),
                    walk=walk_mins,
                    ml_pct=int(round(ml_prob * 100))
                )
            }
            eligible_results.append(card)
        else:
            rejected_reasons.append(result.get('reason', 'Skipped by decision engine.'))

    # Sort eligible offers by ML Model Score descending
    eligible_results.sort(key=lambda x: (x['ml_model_score'], x['ranking_score']), reverse=True)

    # 4. Format Assistant Response
    if eligible_results:
        top_offers = eligible_results[:3]
        response_text = f"🤖 {texts['found_offers']}\n"
        if pref != 'anything':
            response_text += f"• Craving: **{pref.replace('_', ' ').title()}** ({food_type.replace('_', '-').title()})\n"
        response_text += f"• Budget cap: **₹{int(budget)}** | Max Walk: **{int(max_dist/80)} mins**"

        follow_up = None
    else:
        # Diagnostic analysis of rejection reasons
        response_text = f"🤖 {texts['greeting_no_offers']}\n\n"
        
        # Check budget or distance reasons
        b_reasons = [r for r in rejected_reasons if 'wallet' in r.lower() or 'budget' in r.lower() or 'price' in r.lower()]
        d_reasons = [r for r in rejected_reasons if 'distance' in r.lower() or 'far' in r.lower()]
        
        if b_reasons:
            suggested_b = int(budget * 1.3)
            response_text += f"💡 {texts['budget_exceeded']}₹{suggested_b}.\n"
        elif d_reasons:
            response_text += f"💡 {texts['distance_exceeded']}\n"
        else:
            response_text += "💡 Try broadening your preference tags or increasing your travel time."

        follow_up = texts['followup_prompt']

    return {
        'response_text': response_text,
        'language': lang,
        'context': updated_context,
        'offers': eligible_results[:3],
        'follow_up_prompt': follow_up,
        'total_eligible_count': len(eligible_results)
    }

MERCHANT_ASSISTANT_TEXTS = {
  'en': {
    'low_stock_header': "📦 **Inventory Insights**",
    'promo_header': "🚀 **Recommended Promotion**",
    'perf_header': "📊 **Offer Performance Summary**",
    'margin_info': "🛡️ **Margin Protection**: Max discount capped at {max_disc}% to preserve your {min_margin}% min profit margin."
  },
  'hi-en': {
    'low_stock_header': "📦 **Inventory Insights**",
    'promo_header': "🚀 **Recommended Promotion**",
    'perf_header': "📊 **Offer Performance Summary**",
    'margin_info': "🛡️ **Margin Protection**: Max discount {max_disc}% par cap hai taaki aapka {min_margin}% min profit margin safe rahe."
  },
  'hi': {
    'low_stock_header': "📦 **इन्वेंटरी विश्लेषण**",
    'promo_header': "🚀 **अनुशंसित प्रचार**",
    'perf_header': "📊 **ऑफ़र प्रदर्शन सारांश**",
    'margin_info': "🛡️ **मार्जिन सुरक्षा**: अधिकतम छूट {max_disc}% तक सीमित है ताकि आपका {min_margin}% न्यूनतम लाभ मार्जिन सुरक्षित रहे।"
  },
  'kn-en': {
    'low_stock_header': "📦 **Inventory Insights**",
    'promo_header': "🚀 **Recommended Promotion**",
    'perf_header': "📊 **Offer Performance Summary**",
    'margin_info': "🛡️ **Margin Protection**: Discount {max_disc}% ge cap maadalaagide nimma {min_margin}% min margin safe iralu."
  },
  'ta-en': {
    'low_stock_header': "📦 **Inventory Insights**",
    'promo_header': "🚀 **Recommended Promotion**",
    'perf_header': "📊 **Offer Performance Summary**",
    'margin_info': "🛡️ **Margin Protection**: Max discount {max_disc}% kkul cap seyyappattuladhu ungal {min_margin}% min margin paadhukaaka."
  },
  'te-en': {
    'low_stock_header': "📦 **Inventory Insights**",
    'promo_header': "🚀 **Recommended Promotion**",
    'perf_header': "📊 **Offer Performance Summary**",
    'margin_info': "🛡️ **Margin Protection**: Max discount {max_disc}% ki cap cheyabaddindi mee {min_margin}% min margin safe ga undataniki."
  }
}

def process_merchant_chat(
    merchant_id: str,
    message: str,
    language: str = 'en',
    context: dict = None
) -> dict:
    """
    Multilingual Merchant AI Business Assistant Pipeline:
    1. Inspects authenticated merchant profile, menu, stock, cost, and min profit margin.
    2. Fetches recorded offer response stats (sent, accepted, rejected).
    3. Evaluates real margin bounds via `optimize_discount`.
    4. Formats data-grounded insights & recommendations in merchant's language.
    5. Prepares draft offer requiring explicit merchant approval.
    """
    from .data_loader import get_merchant, get_offer_responses
    from .discount import optimize_discount

    lang = language.lower() if language in MERCHANT_ASSISTANT_TEXTS else 'en'
    texts = MERCHANT_ASSISTANT_TEXTS.get(lang, MERCHANT_ASSISTANT_TEXTS['en'])

    data = get_data()
    merchant = get_merchant(merchant_id)
    if not merchant:
        return {
            'response_text': "⚠️ Merchant profile not found.",
            'language': lang,
            'draft_offer': None
        }

    menu_items = data.get('merchant_catalog', {}).get(merchant_id, [])
    responses = get_offer_responses(merchant_id)
    
    max_disc = float(merchant.get('max_discount_pct', 20.0))
    min_m = float(merchant.get('min_margin_pct', 15.0))
    m_name = merchant.get('name', 'Partner Cafe')

    # Analyze inventory
    low_stock = [i for i in menu_items if i.get('stock_units', 0) <= 5 and i.get('stock_units', 0) > 0]
    out_of_stock = [i for i in menu_items if i.get('stock_units', 0) == 0]
    surplus_items = [i for i in menu_items if i.get('stock_units', 0) > 10]

    # Analyze performance
    sent_count = len(responses)
    accepted_count = len([r for r in responses if r.get('action') == 'accepted'])
    rejected_count = len([r for r in responses if r.get('action') == 'rejected'])
    accept_rate = round(accepted_count / max(1, sent_count) * 100, 1) if sent_count > 0 else 0.0

    # Evaluate best candidate item for promotion while strictly respecting min_margin
    best_candidate = None
    best_opt = None
    best_margin_headroom = -1.0

    for item in menu_items:
        if item.get('stock_units', 0) > 0:
            price = float(item.get('price_inr', 100))
            cost = float(item.get('unit_cost_inr', merchant.get('unit_cost_inr', 50)))
            opt = optimize_discount(get_customer('c_020'), merchant, item, dist_m=200)

            final_p = opt['final_price_inr']
            profit = final_p - cost
            margin_pct = (profit / max(1.0, final_p)) * 100.0

            if margin_pct >= min_m:
                if margin_pct > best_margin_headroom:
                    best_margin_headroom = margin_pct
                    best_candidate = item
                    best_opt = opt

    # Build response text
    response_lines = [
        f"🤖 **Bitezy AI Partner Insights for {m_name}**\n"
    ]

    # Inventory section
    if low_stock:
        items_str = ", ".join([f"{i['title']} ({i['stock_units']} left)" for i in low_stock])
        response_lines.append(f"{texts['low_stock_header']}: Low stock on **{items_str}**.")

    # Performance section
    response_lines.append(f"{texts['perf_header']}: {sent_count} offers sent, {accepted_count} accepted ({accept_rate}% rate).")
    response_lines.append(texts['margin_info'].format(max_disc=int(max_disc), min_margin=int(min_m)))

    draft_offer = None

    if best_candidate and best_opt:
        proposed_disc = best_opt['discount_pct']
        final_p = best_opt['final_price_inr']
        cost = float(best_candidate.get('unit_cost_inr', merchant.get('unit_cost_inr', 50)))
        est_profit = round(final_p - cost, 2)
        est_margin = round((est_profit / max(1.0, final_p)) * 100.0, 1)

        response_lines.append(f"\n{texts['promo_header']}: Promote **{best_candidate['title']}** at **{proposed_disc}% OFF** (₹{final_p}).")
        response_lines.append(f"💰 Estimated profit per unit: **₹{est_profit}** ({est_margin}% profit margin).")

        # Create draft offer object for merchant review & approval
        draft_offer = {
            'merchant_id': merchant_id,
            'item_id': best_candidate['id'],
            'item_name': best_candidate['title'],
            'title': f"{proposed_disc}% OFF on {best_candidate['title']}",
            'description': f"Special promotion at {m_name}! Fresh {best_candidate['title']} at ₹{final_p}.",
            'discount_pct': proposed_disc,
            'base_price_inr': best_candidate['price_inr'],
            'final_price_inr': final_p,
            'estimated_profit_inr': est_profit,
            'profit_margin_pct': est_margin,
            'valid_minutes': 60,
            'max_redemptions': min(30, best_candidate.get('stock_units', 30))
        }

    return {
        'response_text': "\n".join(response_lines),
        'language': lang,
        'merchant_id': merchant_id,
        'inventory_summary': {
            'total_menu_items': len(menu_items),
            'low_stock_count': len(low_stock),
            'out_of_stock_count': len(out_of_stock)
        },
        'performance_summary': {
            'offers_sent': sent_count,
            'accepted_count': accepted_count,
            'rejected_count': rejected_count,
            'acceptance_rate_pct': accept_rate
        },
        'draft_offer': draft_offer
    }

