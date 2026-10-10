def generate_notification(merchant, item, discount_pct, final_price, walk_minutes, weather_note, customer_language, scenario):
    m_name = merchant.get('name', 'Merchant')
    i_title = item.get('title', 'Item')
    walk = int(walk_minutes)
    
    lang = str(customer_language).lower() if customer_language else 'en'
    
    if discount_pct > 0:
        if lang == 'hi-en':
            body = f"{m_name} mein save karein! {i_title} sirf ₹{final_price} mein. {walk} min walk hai."
        elif lang == 'kn-en':
            body = f"{m_name} nalli save maadi! {i_title} ₹{final_price}ge. {walk} min naḍige."
        elif lang == 'ta-en':
            body = f"{m_name}il save pannunga! {i_title} veral ₹{final_price}. {walk} nimida naḍai."
        elif lang == 'te-en':
            body = f"{m_name}lo save cheyyandi! {i_title} kevalam ₹{final_price}. {walk} nimisala naḍaka."
        elif lang == 'hi':
            body = f"{m_name} में बचत करें! {i_title} केवल ₹{final_price} में। {walk} मिनट की पैदल दूरी।"
        elif lang == 'kn':
            body = f"{m_name} ನಲ್ಲಿ ಉಳಿಸಿ! {i_title} ಕೇವಲ ₹{final_price} ಗೆ. {walk} ನಿಮಿಷದ ನಡಿಗೆ."
        else: # en and fallback
            savings = round(item.get('price_inr', 0) - final_price, 2)
            body = f"Save ₹{savings} at {m_name}! {i_title} for ₹{final_price}. Just {walk} min walk away."
            
        title = f"Special offer at {m_name}!"
    else:
        title = f"Check out {m_name}"
        body = f"Visit {m_name} — {i_title} at ₹{final_price}."
        
    return {
        'title': title,
        'body': body,
        'language': customer_language if customer_language else 'en',
        'cta': "Grab it"
    }
