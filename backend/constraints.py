import math
from datetime import datetime
import pandas as pd

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def check_consent(customer) -> tuple[bool, str]:
    # Ensure explicit boolean check since pandas might have read True/False or 1/0
    consent = customer.get('marketing_consent')
    if pd.isna(consent):
        consent = True
    elif isinstance(consent, str):
        consent = consent.lower() in ('true', '1', 't', 'y', 'yes')
    if not consent:
        return False, "Customer has opted out of marketing."
    return True, ""

def check_merchant_open(merchant, scenario_dt) -> tuple[bool, str]:
    hour = scenario_dt.hour + scenario_dt.minute / 60.0
    open_h = merchant.get('open_hour', 0)
    close_h = merchant.get('close_hour', 24)
    if pd.isna(open_h): open_h = 0
    if pd.isna(close_h): close_h = 24
    if open_h <= hour < close_h:
        return True, ""
    return False, "Merchant is closed."

def check_promo_window(merchant, scenario_dt) -> tuple[bool, str]:
    promo_start = merchant.get('promo_start_hour')
    promo_end = merchant.get('promo_end_hour')
    weekdays_only = merchant.get('weekdays_only', False)
    if pd.isna(weekdays_only):
        weekdays_only = False
    elif isinstance(weekdays_only, str):
        weekdays_only = weekdays_only.lower() in ('true', '1', 't', 'y', 'yes')

    if pd.notna(promo_start) and pd.notna(promo_end):
        hour = scenario_dt.hour + scenario_dt.minute / 60.0
        if not (promo_start <= hour < promo_end):
            return False, "Outside of promo window."
    
    if weekdays_only:
        # Monday is 0, Sunday is 6
        if scenario_dt.weekday() > 4:
            return False, "Promotions are weekdays only."
            
    return True, ""

def check_distance(customer_lat, customer_lng, merchant_lat, merchant_lng, max_m=1500) -> tuple[bool, str, float]:
    dist_m = haversine_m(customer_lat, customer_lng, merchant_lat, merchant_lng)
    if dist_m > max_m:
        return False, f"Distance too far ({dist_m:.0f}m).", dist_m
    return True, "", dist_m

def check_stock(items) -> list:
    return [item for item in items if pd.notna(item.get('stock_units')) and item['stock_units'] > 0]

def check_budget(price, wallet) -> tuple[bool, str]:
    if pd.isna(wallet):
        return True, ""
    if price <= wallet:
        return True, ""
    return False, "Not enough wallet balance."

def check_margin(price, unit_cost, min_margin_pct, discount_pct) -> tuple[bool, str, float]:
    final_price = price * (1 - discount_pct / 100.0)
    min_price = unit_cost * (1 + min_margin_pct / 100.0)
    if final_price < min_price:
        return False, "Violates minimum margin constraint.", final_price
    return True, "", final_price

def check_time_feasibility(walk_minutes, prep_minutes, minutes_available) -> tuple[bool, str]:
    if pd.isna(minutes_available):
        return True, ""
    
    # Assume round-trip walk plus prep time must fit in minutes available
    total_time = walk_minutes * 2 + (prep_minutes if pd.notna(prep_minutes) else 0)
    if total_time > minutes_available:
        return False, "Not enough time available."
    return True, ""
