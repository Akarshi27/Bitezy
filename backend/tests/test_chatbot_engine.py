"""
Tests for Multilingual Chatbot Engine and POST /customer/chat endpoint.
Verifies NL extraction, context refinement, PyTorch ML scoring, and decision engine integration.
"""
import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.main import app
from backend.chat_engine import extract_requirements, process_customer_chat

class TestChatbotEngineSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_extract_requirements_english(self):
        txt = "I want spicy South Indian food under ₹150, within 10 min walking distance"
        req = extract_requirements(txt)
        self.assertEqual(req.get('food_preference'), 'south_indian')
        self.assertEqual(req.get('budget'), 150.0)
        self.assertEqual(req.get('max_distance_m'), 800)

    def test_extract_requirements_hinglish(self):
        txt = "Mujhe ₹150 ke andar vegetarian South Indian food chahiye"
        req = extract_requirements(txt, language='hi-en')
        self.assertEqual(req.get('food_preference'), 'south_indian')
        self.assertEqual(req.get('food_type'), 'veg')
        self.assertEqual(req.get('budget'), 150.0)

    def test_extract_requirements_hindi(self):
        txt = "मुझे ₹150 के अंदर शाकाहारी साउथ इंडियन खाना चाहिए"
        req = extract_requirements(txt, language='hi')
        self.assertEqual(req.get('food_preference'), 'south_indian')
        self.assertEqual(req.get('food_type'), 'veg')
        self.assertEqual(req.get('budget'), 150.0)

    def test_conversational_refinement(self):
        # Initial query
        init_context = {'food_preference': 'south_indian', 'food_type': 'veg', 'budget': 150.0}
        # Refinement query
        refine_txt = "Increase my budget to ₹250 and find something closer"
        updated = extract_requirements(refine_txt, current_context=init_context)
        
        # Should retain food_preference and food_type while updating budget
        self.assertEqual(updated.get('food_preference'), 'south_indian')
        self.assertEqual(updated.get('food_type'), 'veg')
        self.assertEqual(updated.get('budget'), 250.0)

    def test_process_customer_chat_pipeline(self):
        res = process_customer_chat(
            customer_id="c_020",
            message="I want South Indian food under ₹300",
            language="en"
        )
        self.assertIn("response_text", res)
        self.assertIn("context", res)
        self.assertIsInstance(res.get("offers"), list)
        if res["offers"]:
            top = res["offers"][0]
            self.assertIn("ml_model_score", top)
            self.assertIn("merchant_name", top)
            self.assertIn("discounted_price", top)

    def test_chat_endpoint_success(self):
        res = self.client.post("/customer/chat", json={
            "customer_id": "c_020",
            "message": "Find me a cafe snack under ₹200",
            "language": "hi-en"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("response_text", data)
        self.assertEqual(data.get("language"), "hi-en")

if __name__ == '__main__':
    unittest.main()
