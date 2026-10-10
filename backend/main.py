from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from .data_loader import (
    get_data, sanitize_json_obj, record_offer_response,
    get_offer_responses, add_merchant_item, update_merchant_item, delete_merchant_item,
    register_customer, login_customer, update_customer_profile,
    register_merchant, login_merchant, update_merchant_profile, get_customer,
    get_user_id_from_token, destroy_session, sanitize_customer_record
)
from .decision import decide
from .analytics import compute_baseline_analytics
from .model_scorer import train_and_evaluate_model

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

def require_customer_id(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token required")
    cust_id = get_user_id_from_token(authorization)
    if not cust_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    return cust_id

@app.post('/auth/customer/register')
async def cust_register_endpoint(payload: dict):
    try:
        res = register_customer(payload)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/auth/customer/login')
async def cust_login_endpoint(payload: dict):
    try:
        res = login_customer(payload.get('email', ''), payload.get('password', ''))
        return res
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post('/auth/customer/logout')
async def cust_logout_endpoint(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token required")
    ok = destroy_session(authorization)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid session token")
    return {"status": "logged_out"}

@app.get('/customer/profile/me')
async def get_my_profile(authorization: str = Header(None)):
    cust_id = require_customer_id(authorization)
    cust = get_customer(cust_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return sanitize_customer_record(cust)

@app.put('/customer/profile/me')
async def update_my_profile(payload: dict, authorization: str = Header(None)):
    cust_id = require_customer_id(authorization)
    try:
        res = update_customer_profile(cust_id, payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put('/customer/profile/{customer_id}')
async def cust_profile_endpoint(customer_id: str, payload: dict, authorization: str = Header(None)):
    auth_id = require_customer_id(authorization)
    if auth_id != customer_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot edit another customer's profile")
    try:
        res = update_customer_profile(customer_id, payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/auth/merchant/register')
async def merch_register_endpoint(payload: dict):
    try:
        res = register_merchant(payload)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/auth/merchant/login')
async def merch_login_endpoint(payload: dict):
    try:
        res = login_merchant(payload.get('email', ''), payload.get('password', ''))
        return res
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.put('/merchant/me/{merchant_id}')
async def update_merchant_profile_endpoint(merchant_id: str, payload: dict):
    try:
        res = update_merchant_profile(merchant_id, payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/decide')
async def decide_endpoint(scenario: dict):
    return sanitize_json_obj(decide(scenario))

@app.post('/batch')
async def batch_decide(scenarios: list[dict]):
    return sanitize_json_obj([decide(s) for s in scenarios])

@app.get('/data/scenarios')
async def get_scenarios():
    data = get_data()
    return sanitize_json_obj(list(data['scenarios'].values()))

@app.get('/data/merchants')
async def get_merchants():
    data = get_data()
    return sanitize_json_obj(list(data['merchants'].values()))

@app.get('/data/customers')
async def get_customers():
    data = get_data()
    return sanitize_json_obj(list(data['customers'].values()))

@app.get('/data/catalog')
async def get_catalog():
    data = get_data()
    return sanitize_json_obj(list(data['catalog'].values()))

@app.get('/analytics/baselines')
async def get_baselines():
    return compute_baseline_analytics()

@app.get('/model/train')
async def train_model_endpoint():
    return train_and_evaluate_model()

@app.post('/offer/respond')
async def respond_offer(payload: dict):
    res = record_offer_response(payload)
    return sanitize_json_obj({"status": "recorded", "data": res})

@app.get('/offer/responses')
async def list_offer_responses(merchant_id: str = None):
    return sanitize_json_obj(get_offer_responses(merchant_id))

@app.get('/merchant/me/{merchant_id}')
async def get_merchant_profile(merchant_id: str):
    data = get_data()
    if merchant_id not in data['merchants']:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return sanitize_json_obj(data['merchants'][merchant_id])

@app.get('/merchant/menu/{merchant_id}')
async def get_merchant_menu(merchant_id: str):
    data = get_data()
    items = data['merchant_catalog'].get(merchant_id, [])
    return sanitize_json_obj(items)

@app.post('/merchant/menu/{merchant_id}/add')
async def add_menu_item(merchant_id: str, item_data: dict):
    item = add_merchant_item(merchant_id, item_data)
    return sanitize_json_obj(item)

@app.put('/merchant/menu/{merchant_id}/item/{item_id}')
async def update_menu_item(merchant_id: str, item_id: str, item_data: dict):
    item = update_merchant_item(merchant_id, item_id, item_data)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return sanitize_json_obj(item)

@app.delete('/merchant/menu/{merchant_id}/item/{item_id}')
async def delete_menu_item(merchant_id: str, item_id: str):
    ok = delete_merchant_item(merchant_id, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}

@app.get('/merchant/analytics/{merchant_id}')
async def get_merchant_analytics(merchant_id: str):
    responses = get_offer_responses(merchant_id)
    accepted = len([r for r in responses if r.get('action') == 'accepted'])
    rejected = len([r for r in responses if r.get('action') == 'rejected'])
    total = len(responses)
    rate = round(accepted / max(1, total) * 100, 1) if total > 0 else 0.0

    return sanitize_json_obj({
        "merchant_id": merchant_id,
        "offers_sent": total,
        "accepted_count": accepted,
        "rejected_count": rejected,
        "acceptance_rate_pct": rate,
        "responses": responses
    })

@app.get('/evaluate')
async def run_evaluation():
    return {"status": "Evaluation should be run via CLI or batch_predict.py"}



