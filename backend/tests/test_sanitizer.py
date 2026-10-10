import unittest
import math
import json
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.data_loader import sanitize_json_obj
from backend.main import app

class TestSanitizerAndEndpoints(unittest.TestCase):
    def test_sanitize_primitive_nans(self):
        self.assertIsNone(sanitize_json_obj(float('nan')))
        self.assertIsNone(sanitize_json_obj(float('inf')))
        self.assertIsNone(sanitize_json_obj(float('-inf')))
        self.assertIsNone(sanitize_json_obj(np.nan))
        self.assertIsNone(sanitize_json_obj(np.float64(np.nan)))
        self.assertIsNone(sanitize_json_obj(pd.NA))

    def test_sanitize_nested_structures(self):
        nested_data = {
            "id": "test_001",
            "wallet_override": np.nan,
            "declared_preferences": float('nan'),
            "valid_numbers": [10.5, np.nan, float('inf'), 20],
            "nested_dict": {
                "promo_start_hour": np.nan,
                "title": "Special Promo",
                "active": True
            }
        }
        sanitized = sanitize_json_obj(nested_data)
        
        # Verify JSON compliance
        json_str = json.dumps(sanitized, allow_nan=False)
        parsed = json.loads(json_str)

        self.assertIsNone(parsed["wallet_override"])
        self.assertIsNone(parsed["declared_preferences"])
        self.assertEqual(parsed["valid_numbers"], [10.5, None, None, 20])
        self.assertIsNone(parsed["nested_dict"]["promo_start_hour"])
        self.assertEqual(parsed["nested_dict"]["title"], "Special Promo")
        self.assertTrue(parsed["nested_dict"]["active"])

    def test_api_data_scenarios_endpoint(self):
        client = TestClient(app)
        response = client.get("/data/scenarios")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterThan(len(data), 0)
        # Ensure json.dumps passes cleanly without NaN
        json.dumps(data, allow_nan=False)

    def test_api_data_merchants_endpoint(self):
        client = TestClient(app)
        response = client.get("/data/merchants")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterThan(len(data), 0)
        json.dumps(data, allow_nan=False)

    def test_api_data_customers_endpoint(self):
        client = TestClient(app)
        response = client.get("/data/customers")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterThan(len(data), 0)
        json.dumps(data, allow_nan=False)

    def assertGreaterThan(self, val, min_val):
        self.assertTrue(val > min_val)

if __name__ == '__main__':
    unittest.main()
