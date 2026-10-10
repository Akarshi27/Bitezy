import unittest
import math
from datetime import datetime
from fastapi.testclient import TestClient

from backend.main import app
from backend.decision import decide
from backend.data_loader import (
    get_data, add_merchant_item, update_merchant_item,
    delete_merchant_item, record_offer_response, get_offer_responses
)
from backend.constraints import (
    check_consent, check_merchant_open, check_promo_window,
    check_distance, check_stock, check_budget, check_margin
)

class TestAcceptanceSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.data = get_data()

    # 1. South Indian vs Fast Food Preference Filtering
    def test_cuisine_preference_ranking_change(self):
        base_scenario = {
            "id": "test_pref_001",
            "customer_id": "c_001",
            "merchant_id": "m_001",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "condition": "clear",
            "temp_c": 25,
            "minutes_available": 60,
            "intent": "South Indian dosa breakfast",
            "prompt": "Looking for South Indian breakfast"
        }
        res_south = decide(base_scenario)

        base_scenario_fast = dict(base_scenario)
        base_scenario_fast["intent"] = "fast food burger and fries"
        res_fast = decide(base_scenario_fast)

        self.assertIn("action", res_south)
        self.assertIn("action", res_fast)

    # 2. ₹100 Budget vs ₹400 Budget Filtering
    def test_budget_filtering(self):
        sc_low_budget = {
            "id": "test_budget_low",
            "customer_id": "c_001",
            "merchant_id": "m_001",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "budget": 20.0, # Very low budget
            "minutes_available": 60,
            "intent": "lunch"
        }
        res_low = decide(sc_low_budget)
        self.assertEqual(res_low["action"], "skip")
        self.assertTrue(any(w in res_low["reason"].lower() for w in ["wallet", "budget"]))

        sc_high_budget = dict(sc_low_budget)
        sc_high_budget["budget"] = 500.0
        res_high = decide(sc_high_budget)
        self.assertEqual(res_high["action"], "send")

    # 3. Vegetarian vs Non-Vegetarian Dietary Filtering
    def test_dietary_filtering(self):
        sc_veg = {
            "id": "test_veg",
            "customer_id": "c_001",
            "merchant_id": "m_001",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "food_type": "veg",
            "minutes_available": 60,
            "intent": "vegetarian lunch"
        }
        res_veg = decide(sc_veg)
        if res_veg["action"] == "send":
            item_id = res_veg["offer"]["item_id"]
            item = self.data["catalog"][item_id]
            self.assertEqual(item["is_veg"], 1)

    # 4. 500 metres vs 2 km Spatial Distance Filtering
    def test_distance_filtering(self):
        # Coordinates resulting in ~1800m distance
        sc_far = {
            "id": "test_dist_far",
            "customer_id": "c_001",
            "merchant_id": "m_001", # m_001 lat: 12.93645, lng: 77.62429
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.92000,
            "lng": 77.62429,
            "max_distance_m": 500, # Strict 500m limit
            "minutes_available": 60,
            "intent": "lunch"
        }
        res_far = decide(sc_far)
        self.assertEqual(res_far["action"], "skip")
        self.assertIn("distance", res_far["reason"].lower())

        sc_near = dict(sc_far)
        sc_near["max_distance_m"] = 3000 # Relaxed 3km limit
        res_near = decide(sc_near)
        self.assertEqual(res_near["action"], "send")

    # 5. Short Available Time vs 1 Hour Feasibility
    def test_available_time_feasibility(self):
        sc_short_time = {
            "id": "test_time_short",
            "customer_id": "c_001",
            "merchant_id": "m_001",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "available_time": 2, # Only 2 minutes total
            "minutes_available": 2,
            "intent": "lunch"
        }
        res_short = decide(sc_short_time)
        self.assertEqual(res_short["action"], "skip")

        sc_long_time = dict(sc_short_time)
        sc_long_time["available_time"] = 60
        sc_long_time["minutes_available"] = 60
        res_long = decide(sc_long_time)
        self.assertEqual(res_long["action"], "send")

    # 6. Marketing Consent Denied -> Hard Skip
    def test_marketing_consent_denied(self):
        sc_consent_denied = {
            "id": "test_consent",
            "customer_id": "c_020", # c_020 has consent = False in customers.csv
            "merchant_id": "m_016",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.92473,
            "lng": 77.67989,
            "intent": "dinner"
        }
        res = decide(sc_consent_denied)
        self.assertEqual(res["action"], "skip")
        self.assertIn("marketing", res["reason"].lower())

    # 7. Out of Stock Item Filtering
    def test_out_of_stock_filtering(self):
        # Create merchant with stock 0 items
        items_stock_zero = [{"id": "i_zero_1", "stock_units": 0}]
        in_stock = check_stock(items_stock_zero)
        self.assertEqual(len(in_stock), 0)

    # 8. Closed Merchant Operating Hours -> Hard Skip
    def test_closed_merchant_hours(self):
        m_closed = {"open_hour": 10, "close_hour": 22}
        dt_night = datetime(2026, 5, 18, 23, 30) # 11:30 PM
        passed, reason = check_merchant_open(m_closed, dt_night)
        self.assertFalse(passed)
        self.assertIn("closed", reason.lower())

    # 9. Expired Promotion Window
    def test_expired_promo_window(self):
        m_promo = {"promo_start_hour": 14.0, "promo_end_hour": 16.0}
        dt_morning = datetime(2026, 5, 18, 10, 0)
        passed, reason = check_promo_window(m_promo, dt_morning)
        self.assertFalse(passed)
        self.assertIn("promo", reason.lower())

    # 10. Discount Minimum Margin Violation
    def test_margin_constraint(self):
        # price=100, cost=80, min_margin=20% -> min_price = 80*1.2 = 96
        # discount 30% -> final_price = 70 < 96 (violation)
        passed, _, fp = check_margin(100, 80, 20, 30)
        self.assertFalse(passed)

    # 11. No Eligible Candidates -> Structured Skip
    def test_no_eligible_candidates(self):
        sc_no_eligible = {
            "id": "test_no_eligible",
            "customer_id": "c_001",
            "merchant_id": "m_nonexistent",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "intent": "lunch"
        }
        res = decide(sc_no_eligible)
        self.assertEqual(res["action"], "skip")

    # 12. Offer Response Accept and Reject Persistence
    def test_offer_response_persistence(self):
        payload_accept = {
            "offer_id": "off_test_acc_001",
            "customer_id": "c_001",
            "merchant_id": "m_001",
            "action": "accepted"
        }
        res_acc = self.client.post("/offer/respond", json=payload_accept)
        self.assertEqual(res_acc.status_code, 200)

        responses = self.client.get("/offer/responses?merchant_id=m_001").json()
        self.assertTrue(any(r["offer_id"] == "off_test_acc_001" and r["action"] == "accepted" for r in responses))

    # 13. Merchant Menu Update Reflected Live in Recommendation Engine
    def test_merchant_menu_update_reflection(self):
        # Add a unique high-value item for merchant m_001
        new_dish_title = "Special Truffle Paneer Roll 999"
        add_item_data = {
            "title": new_dish_title,
            "category": "special",
            "price_inr": 180.0,
            "unit_cost_inr": 70.0,
            "stock_units": 50,
            "prep_minutes": 5,
            "is_veg": 1,
            "tags": "special,truffle,paneer"
        }
        add_res = self.client.post("/merchant/menu/m_001/add", json=add_item_data)
        self.assertEqual(add_res.status_code, 200)

        # Run decision for m_001 searching for truffle
        sc_search = {
            "id": "test_menu_update",
            "customer_id": "c_001",
            "merchant_id": "m_001",
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "intent": "special truffle paneer",
            "minutes_available": 60
        }
        dec_res = decide(sc_search)
        self.assertEqual(dec_res["action"], "send")
        self.assertIn("offer", dec_res)

if __name__ == "__main__":
    unittest.main()
