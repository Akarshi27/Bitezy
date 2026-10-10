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

def get_customer(customer_id):
    data = get_data()
    if customer_id in data['customers']:
        return dict(data['customers'][customer_id])
    
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
