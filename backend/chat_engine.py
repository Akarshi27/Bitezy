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
