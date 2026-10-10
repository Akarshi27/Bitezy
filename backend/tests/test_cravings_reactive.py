import unittest
from backend.decision import decide
from backend.data_loader import get_data

class TestCravingsReactiveSuite(unittest.TestCase):
    def setUp(self):
        self.data = get_data()
        self.base_scenario = {
            "id": "cravings_test_001",
            "customer_id": "c_001",
            "merchant_id": "m_001", # m_001 is a Cafe in Koramangala (open 08:00 - 22:00)
            "timestamp": "2026-05-18T14:00:00",
            "lat": 12.93645,
            "lng": 77.62429,
            "minutes_available": 60,
            "intent": "lunch snack",
            "budget": 300,
            "max_distance_m": 2000,
            "food_type": "both",
            "food_preference": "anything"
        }

    def test_cuisine_craving_filtering(self):
        # Cafe merchant m_001 should pass for cafe / anything
        sc_cafe = dict(self.base_scenario, food_preference="cafe")
        res_cafe = decide(sc_cafe)
        self.assertEqual(res_cafe["action"], "send")

        # Cafe merchant m_001 should skip for south_indian craving
        sc_south = dict(self.base_scenario, food_preference="south_indian")
        res_south = decide(sc_south)
        self.assertEqual(res_south["action"], "skip")
        self.assertIn("category", res_south["reason"].lower())

    def test_budget_craving_filtering(self):
        # Budget of ₹20 should skip
        sc_low = dict(self.base_scenario, budget=20)
        res_low = decide(sc_low)
        self.assertEqual(res_low["action"], "skip")

        # Budget of ₹300 should send
        sc_high = dict(self.base_scenario, budget=300)
        res_high = decide(sc_high)
        self.assertEqual(res_high["action"], "send")

    def test_dietary_craving_filtering(self):
        sc_veg = dict(self.base_scenario, food_type="veg")
        res_veg = decide(sc_veg)
        if res_veg["action"] == "send":
            item_id = res_veg["offer"]["item_id"]
            item = self.data["catalog"][item_id]
            self.assertEqual(item["is_veg"], 1)

    def test_max_distance_craving_filtering(self):
        # Scenario location 3km away from m_001
        sc_far = dict(self.base_scenario, lat=12.90000, lng=77.62429, max_distance_m=500)
        res_far = decide(sc_far)
        self.assertEqual(res_far["action"], "skip")

    def test_available_time_craving_filtering(self):
        # Available time of 2 mins should skip (walk time + prep time > 2 mins)
        sc_tight = dict(self.base_scenario, available_time=2, minutes_available=2)
        res_tight = decide(sc_tight)
        self.assertEqual(res_tight["action"], "skip")

if __name__ == "__main__":
    unittest.main()
