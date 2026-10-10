import pandas as pd
import numpy as np
import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / 'data'

def sanitize_json_obj(obj):
    """
    Recursively converts pandas/numpy NaN, NaT, Inf, and other non-finite values
    into JSON-compliant None values for API responses.
    """
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {str(k): sanitize_json_obj(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [sanitize_json_obj(v) for v in obj]
    if isinstance(obj, (float, np.floating)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    try:
        if pd.isna(obj):
            return None
    except Exception:
        pass
    return obj

def parse_json(val):
    if pd.isna(val) or not val:
        return []
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return []

def load_data():
    customers_df = pd.read_csv(DATA_DIR / 'customers.csv')
    customers_df['visit_history'] = customers_df['visit_history'].apply(parse_json)
    customers = {row['id']: row.to_dict() for _, row in customers_df.iterrows()}

    merchants_df = pd.read_csv(DATA_DIR / 'merchants.csv')
    merchants = {row['id']: row.to_dict() for _, row in merchants_df.iterrows()}

    catalog_df = pd.read_csv(DATA_DIR / 'catalog_items.csv')
    # Normalize merchant_id
    catalog_df['merchant_id'] = catalog_df['merchant_id'].apply(lambda x: f"m_l_{x}" if str(x).startswith("MER-") else x)
    catalog = {row['id']: row.to_dict() for _, row in catalog_df.iterrows()}
    
    # Group catalog by merchant
    merchant_catalog = {}
    for item in catalog.values():
        merchant_catalog.setdefault(item['merchant_id'], []).append(item)

    static_offers = {}
    if (DATA_DIR / 'static_offers.csv').exists():
        static_offers_df = pd.read_csv(DATA_DIR / 'static_offers.csv')
        static_offers = {row['id']: row.to_dict() for _, row in static_offers_df.iterrows()}

    weather = []
    if (DATA_DIR / 'weather_hourly.csv').exists():
        weather_df = pd.read_csv(DATA_DIR / 'weather_hourly.csv')
        weather = weather_df.to_dict(orient='records')

    festivals = []
    if (DATA_DIR / 'festivals.csv').exists():
        festivals_df = pd.read_csv(DATA_DIR / 'festivals.csv')
        festivals = festivals_df.to_dict(orient='records')

    scenarios = {}
    if (DATA_DIR / 'scenarios_public.csv').exists():
        scenarios_df = pd.read_csv(DATA_DIR / 'scenarios_public.csv')
        scenarios = {row['id']: row.to_dict() for _, row in scenarios_df.iterrows()}

    return {
        'customers': customers,
        'merchants': merchants,
        'catalog': catalog,
        'merchant_catalog': merchant_catalog,
        'static_offers': static_offers,
        'weather': weather,
        'festivals': festivals,
        'scenarios': scenarios
    }

_data_cache = None

def get_data():
    global _data_cache
    if _data_cache is None:
        _data_cache = load_data()
    return _data_cache

import hashlib

_custom_store_file = DATA_DIR / 'custom_store.json'
_custom_data = {
    'customers': {},
    'merchants': {},
    'offer_responses': []
}

def _load_custom_store():
    global _custom_data
    if _custom_store_file.exists():
        try:
            with open(_custom_store_file, 'r', encoding='utf-8') as f:
                _custom_data = json.load(f)
        except Exception:
            pass

def _save_custom_store():
    try:
        with open(_custom_store_file, 'w', encoding='utf-8') as f:
            json.dump(_custom_data, f, indent=2)
    except Exception:
        pass

_load_custom_store()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def register_customer(cust_data: dict) -> dict:
    email = cust_data.get('email', '').strip().lower()
    if not email:
        raise ValueError("Email is required")
    
    # Check duplicate
    for c in _custom_data['customers'].values():
        if c.get('email') == email:
            raise ValueError("Email already registered")
            
    cust_id = f"c_reg_{len(_custom_data['customers']) + 1:03d}"
    record = {
        'id': cust_id,
        'name': cust_data.get('name', 'Registered User'),
        'email': email,
        'password_hash': hash_password(cust_data.get('password', '123456')),
        'language': cust_data.get('language', 'en'),
        'locality': cust_data.get('locality', 'Koramangala'),
        'marketing_consent': bool(cust_data.get('marketing_consent', True)),
        'wallet_inr': float(cust_data.get('wallet_inr', 500.0)),
        'declared_preferences': cust_data.get('declared_preferences', 'south_indian,cafe'),
        'food_type': cust_data.get('food_type', 'both'),
        'budget': float(cust_data.get('budget', 300.0)),
        'max_distance_m': int(cust_data.get('max_distance_m', 2000)),
        'churn_risk': 0.1,
        'price_sensitivity': 0.5,
        'avg_spend': 200.0,
        'visit_history': []
    }
    
    _custom_data['customers'][cust_id] = record
    _save_custom_store()
    
    # Merge into runtime cache
    data = get_data()
    data['customers'][cust_id] = record
    
    return sanitize_json_obj(record)

def login_customer(email: str, password: str) -> dict:
    email = email.strip().lower()
    hashed = hash_password(password)
    
    # Check custom registered customers
    for c in _custom_data['customers'].values():
        if c.get('email') == email:
            if c.get('password_hash') == hashed:
                return sanitize_json_obj(c)
            else:
                raise ValueError("Invalid credentials")
                
    # Demo fallback check
    data = get_data()
    for c in data['customers'].values():
        if c.get('id') == email or c.get('name', '').lower() == email:
            return sanitize_json_obj(c)
            
    raise ValueError("Account not found")

def update_customer_profile(customer_id: str, updates: dict) -> dict:
    data = get_data()
    cust = data['customers'].get(customer_id)
    if not cust:
        cust = get_customer(customer_id)
        data['customers'][customer_id] = cust
        
    for k in ['name', 'language', 'locality', 'marketing_consent', 'wallet_inr', 'declared_preferences', 'food_type', 'budget', 'max_distance_m']:
        if k in updates:
            cust[k] = updates[k]
            
    if customer_id in _custom_data['customers']:
        _custom_data['customers'][customer_id] = cust
        _save_custom_store()
        
    return sanitize_json_obj(cust)

def register_merchant(merch_data: dict) -> dict:
    email = merch_data.get('email', '').strip().lower()
    if not email:
        raise ValueError("Email is required")
        
    for m in _custom_data['merchants'].values():
        if m.get('email') == email:
            raise ValueError("Merchant email already registered")
            
    merch_id = f"m_reg_{len(_custom_data['merchants']) + 1:03d}"
    record = {
        'id': merch_id,
        'name': merch_data.get('name', 'Partner Cafe'),
        'email': email,
        'password_hash': hash_password(merch_data.get('password', '123456')),
        'category': merch_data.get('category', 'cafe'),
        'locality': merch_data.get('locality', 'Koramangala'),
        'lat': float(merch_data.get('lat', 12.93595)),
        'lng': float(merch_data.get('lng', 77.62484)),
        'capacity': int(merch_data.get('capacity', 30)),
        'occupancy_pct': float(merch_data.get('occupancy_pct', 20.0)),
        'max_discount_pct': float(merch_data.get('max_discount_pct', 20.0)),
        'min_margin_pct': float(merch_data.get('min_margin_pct', 15.0)),
        'open_hour': int(merch_data.get('open_hour', 8)),
        'close_hour': int(merch_data.get('close_hour', 22)),
        'promo_start_hour': float(merch_data.get('promo_start_hour', 13.0)),
        'promo_end_hour': float(merch_data.get('promo_end_hour', 16.0)),
        'weekdays_only': bool(merch_data.get('weekdays_only', False)),
        'languages': merch_data.get('languages', 'en,hi-en'),
        'base_price_inr': float(merch_data.get('base_price_inr', 200.0)),
        'unit_cost_inr': float(merch_data.get('unit_cost_inr', 80.0))
    }
    
    _custom_data['merchants'][merch_id] = record
    _save_custom_store()
    
    data = get_data()
    data['merchants'][merch_id] = record
    data['merchant_catalog'][merch_id] = []
    
    return sanitize_json_obj(record)

def login_merchant(email: str, password: str) -> dict:
    email = email.strip().lower()
    hashed = hash_password(password)
    
    for m in _custom_data['merchants'].values():
        if m.get('email') == email:
            if m.get('password_hash') == hashed:
                return sanitize_json_obj(m)
            else:
                raise ValueError("Invalid credentials")
                
    data = get_data()
    for m in data['merchants'].values():
        if m.get('id') == email or m.get('name', '').lower() == email:
            return sanitize_json_obj(m)
            
    raise ValueError("Merchant account not found")

def update_merchant_profile(merchant_id: str, updates: dict) -> dict:
    data = get_data()
    merch = data['merchants'].get(merchant_id)
    if not merch:
        raise ValueError("Merchant not found")
        
    for k in ['name', 'locality', 'open_hour', 'close_hour', 'promo_start_hour', 'promo_end_hour', 'max_discount_pct', 'min_margin_pct', 'base_price_inr', 'unit_cost_inr']:
        if k in updates:
            merch[k] = updates[k]
            
    if merchant_id in _custom_data['merchants']:
        _custom_data['merchants'][merchant_id] = merch
        _save_custom_store()
        
    return sanitize_json_obj(merch)

def get_customer(customer_id):
    data = get_data()
    if customer_id in data['customers']:
        return dict(data['customers'][customer_id])
    if customer_id in _custom_data['customers']:
        return dict(_custom_data['customers'][customer_id])
    
    return {
        'id': customer_id,
        'name': 'Customer',
        'language': 'en',
        'marketing_consent': True,
        'wallet_inr': 500.0,
        'churn_risk': 0.5,
        'price_sensitivity': 0.5,
        'declared_preferences': '',
        'avg_spend': 200.0,
        'visit_history': []
    }

def record_offer_response(response_dict):
    global _custom_data
    _custom_data['offer_responses'].append(response_dict)
    _save_custom_store()
    return response_dict

def get_offer_responses(merchant_id=None):
    responses = _custom_data.get('offer_responses', [])
    if merchant_id:
        return [r for r in responses if r.get('merchant_id') == merchant_id]
    return responses

def add_merchant_item(merchant_id, item_data):
    data = get_data()
    item_id = item_data.get('id') or f"i_{merchant_id}_{len(data['catalog']) + 1}"
    item_dict = {
        'id': item_id,
        'merchant_id': merchant_id,
        'title': item_data.get('title', 'New Item'),
        'category': item_data.get('category', 'general'),
        'price_inr': float(item_data.get('price_inr', 100)),
        'stock_units': int(item_data.get('stock_units', 10)),
        'prep_minutes': int(item_data.get('prep_minutes', 10)),
        'is_veg': int(item_data.get('is_veg', 1)),
        'tags': item_data.get('tags', '')
    }
    data['catalog'][item_id] = item_dict
    data['merchant_catalog'].setdefault(merchant_id, []).append(item_dict)
    return item_dict

def update_merchant_item(merchant_id, item_id, item_data):
    data = get_data()
    if item_id in data['catalog']:
        item = data['catalog'][item_id]
        if 'title' in item_data: item['title'] = str(item_data['title'])
        if 'category' in item_data: item['category'] = str(item_data['category'])
        if 'price_inr' in item_data: item['price_inr'] = float(item_data['price_inr'])
        if 'stock_units' in item_data: item['stock_units'] = int(item_data['stock_units'])
        if 'prep_minutes' in item_data: item['prep_minutes'] = int(item_data['prep_minutes'])
        if 'is_veg' in item_data: item['is_veg'] = int(item_data['is_veg'])
        if 'tags' in item_data: item['tags'] = str(item_data['tags'])
        return item
    return None

def delete_merchant_item(merchant_id, item_id):
    data = get_data()
    if item_id in data['catalog']:
        del data['catalog'][item_id]
        if merchant_id in data['merchant_catalog']:
            data['merchant_catalog'][merchant_id] = [i for i in data['merchant_catalog'][merchant_id] if i['id'] != item_id]
        return True
    return False

