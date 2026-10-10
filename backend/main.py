from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .data_loader import get_data, sanitize_json_obj
from .decision import decide
from .analytics import compute_baseline_analytics

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

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

@app.get('/evaluate')
async def run_evaluation():
    return {"status": "Evaluation should be run via CLI or batch_predict.py"}


