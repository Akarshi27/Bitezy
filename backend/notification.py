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

def generate_merchant_notification(notif_type: str, merchant: dict, extra_data: dict = None, language: str = 'en') -> dict:
    lang = str(language).lower() if language else 'en'
    m_name = merchant.get('name', 'Partner Cafe')
    extra = extra_data or {}

    if notif_type == 'low_stock':
        item_name = extra.get('item_name', 'Item')
        stock = extra.get('stock_units', 0)
        if lang == 'hi-en':
            title = f"⚠️ Low Stock Alert: {item_name}"
            body = f"{m_name}: {item_name} ke sirf {stock} units bache hain. Stock refill karein ya offer pause karein."
        elif lang == 'hi':
            title = f"⚠️ कम स्टॉक चेतावनी: {item_name}"
            body = f"{m_name}: {item_name} के केवल {stock} यूनिट बचे हैं। कृपया स्टॉक रिफिल करें।"
        elif lang == 'kn-en':
            title = f"⚠️ Low Stock Alert: {item_name}"
            body = f"{m_name}: {item_name} ge kevala {stock} units ide. Stock refill maadi."
        elif lang == 'ta-en':
            title = f"⚠️ Low Stock Alert: {item_name}"
            body = f"{m_name}: {item_name}-il verum {stock} units irukku. Stock refill pannunga."
        elif lang == 'te-en':
            title = f"⚠️ Low Stock Alert: {item_name}"
            body = f"{m_name}: {item_name} ki kevalam {stock} units unnai. Stock refill cheyandi."
        else:
            title = f"⚠️ Low Stock Alert: {item_name}"
            body = f"{m_name}: Only {stock} units of {item_name} remaining. Refill inventory or pause promo."

    elif notif_type == 'offer_published':
        title_txt = extra.get('title', 'Special Offer')
        disc = extra.get('discount_pct', 10)
        if lang == 'hi-en':
            title = "🎉 Offer Published Successfully!"
            body = f"{m_name}: '{title_txt}' ({disc}% OFF) ab live hai."
        elif lang == 'hi':
            title = "🎉 ऑफ़र सफलतापूर्वक प्रकाशित!"
            body = f"{m_name}: '{title_txt}' ({disc}% छूट) अब लाइव है।"
        elif lang == 'kn-en':
            title = "🎉 Offer Published Successfully!"
            body = f"{m_name}: '{title_txt}' ({disc}% OFF) iga live ide."
        elif lang == 'ta-en':
            title = "🎉 Offer Published Successfully!"
            body = f"{m_name}: '{title_txt}' ({disc}% OFF) ippo live-a irukku."
        elif lang == 'te-en':
            title = "🎉 Offer Published Successfully!"
            body = f"{m_name}: '{title_txt}' ({disc}% OFF) ippudu live lo undi."
        else:
            title = "🎉 Offer Published Successfully!"
            body = f"{m_name}: '{title_txt}' ({disc}% OFF) is now live for nearby customers."

    elif notif_type == 'margin_warning':
        min_m = merchant.get('min_margin_pct', 10)
        if lang == 'hi-en':
            title = "🛡️ Minimum Margin Warning"
            body = f"Offer discount aapke min margin ({min_m}%) ko surpass nahi kar sakta."
        elif lang == 'hi':
            title = "🛡️ न्यूनतम मार्जिन चेतावनी"
            body = f"ऑफ़र छूट आपके न्यूनतम लाभ मार्जिन ({min_m}%) का उल्लंघन नहीं कर सकती।"
        else:
            title = "🛡️ Minimum Margin Protection"
            body = f"Requested discount exceeds your minimum profit margin cap of {min_m}%."

    else:
        title = f"Update for {m_name}"
        body = extra.get('message', 'Merchant dashboard status update.')

    return {
        'title': title,
        'body': body,
        'language': lang,
        'timestamp': extra.get('timestamp')
    }

