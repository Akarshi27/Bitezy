"""
Tests for Multilingual Merchant AI Business Assistant & POST /merchant/chat endpoint.
Verifies data isolation, margin protection, inventory insights, draft offer generation, language persistence, and safe publishing.
"""
import sys
import os
import time
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.main import app
from backend.chat_engine import process_merchant_chat

class TestMerchantChatSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_process_merchant_chat_english(self):
        res = process_merchant_chat("m_001", "Which items should I promote today while preserving my minimum profit margin?", language="en")
        self.assertEqual(res["language"], "en")
        self.assertEqual(res["merchant_id"], "m_001")
        self.assertIn("response_text", res)
        self.assertIn("performance_summary", res)
        if res.get("draft_offer"):
            draft = res["draft_offer"]
            self.assertEqual(draft["merchant_id"], "m_001")
            self.assertGreaterEqual(draft["profit_margin_pct"], 10.0)

    def test_process_merchant_chat_hinglish(self):
        res = process_merchant_chat("m_001", "Aaj kaun se available food items par discount dena chahiye?", language="hi-en")
        self.assertEqual(res["language"], "hi-en")
        self.assertIn("response_text", res)

    def test_process_merchant_chat_hindi(self):
        res = process_merchant_chat("m_001", "आज किन आइटम्स पर ऑफर देना सही रहेगा?", language="hi")
        self.assertEqual(res["language"], "hi")
        self.assertIn("response_text", res)

    def test_process_merchant_chat_kannada(self):
        res = process_merchant_chat("m_001", "Yaavude item promotion ge olledu?", language="kn-en")
        self.assertEqual(res["language"], "kn-en")
        self.assertIn("response_text", res)

    def test_process_merchant_chat_tamil(self):
        res = process_merchant_chat("m_001", "Enna offer podalam?", language="ta-en")
        self.assertEqual(res["language"], "ta-en")
        self.assertIn("response_text", res)

    def test_process_merchant_chat_telugu(self):
        res = process_merchant_chat("m_001", "Ey item meeda discount ivvali?", language="te-en")
        self.assertEqual(res["language"], "te-en")
        self.assertIn("response_text", res)

    def test_language_fallback_to_english(self):
        res = process_merchant_chat("m_001", "Check stock", language="fr-FR")
        self.assertEqual(res["language"], "en")
        self.assertIn("response_text", res)

    def test_merchant_data_isolation(self):
        m1_res = process_merchant_chat("m_001", "Check stock", language="en")
        m2_res = process_merchant_chat("m_002", "Check stock", language="en")
        self.assertEqual(m1_res["merchant_id"], "m_001")
        self.assertEqual(m2_res["merchant_id"], "m_002")

    def test_chat_endpoint_success(self):
        res = self.client.post("/merchant/chat", json={
            "merchant_id": "m_001",
            "message": "Give me promotional recommendations",
            "language": "en"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("response_text", data)
        self.assertEqual(data.get("language"), "en")

    def test_merchant_language_persistence(self):
        ts = int(time.time() * 1000)
        email = f"merchant_lang_{ts}@bitezy.com"
        reg_res = self.client.post("/auth/merchant/register", json={
            "email": email,
            "password": "password123",
            "name": "Lang Cafe",
            "owner_name": "Test Owner",
            "category": "cafe",
            "locality": "Koramangala"
        })
        self.assertEqual(reg_res.status_code, 200)
        token = reg_res.json()["token"]

        # Update language to hi-en
        put_res = self.client.put("/merchant/profile/me", json={
            "preferred_language": "hi-en"
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(put_res.status_code, 200)

        # Retrieve profile and verify persistence
        get_res = self.client.get("/merchant/profile/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json().get("preferred_language"), "hi-en")

    def test_safe_offer_publishing_guardrails(self):
        ts = int(time.time() * 1000)
        email1 = f"m1_{ts}@cafe.com"
        email2 = f"m2_{ts}@cafe.com"

        reg1 = self.client.post("/auth/merchant/register", json={
            "email": email1, "password": "password123", "name": "Cafe One", "category": "cafe", "locality": "Indiranagar"
        })
        self.assertEqual(reg1.status_code, 200)
        token1 = reg1.json()["token"]
        merch1_id = reg1.json()["merchant"]["id"]

        reg2 = self.client.post("/auth/merchant/register", json={
            "email": email2, "password": "password123", "name": "Cafe Two", "category": "cafe", "locality": "Indiranagar"
        })
        self.assertEqual(reg2.status_code, 200)
        token2 = reg2.json()["token"]

        # 1. Publishing valid offer passes for Merchant 1
        pub_res = self.client.post(f"/merchant/offers/{merch1_id}", json={
            "title": "AI Suggested Special 15% OFF",
            "description": "Data grounded offer",
            "discount_pct": 15.0,
            "base_price_inr": 200.0,
            "valid_minutes": 60,
            "max_redemptions": 20
        }, headers={"Authorization": f"Bearer {token1}"})
        self.assertEqual(pub_res.status_code, 200)
        offer_id = pub_res.json()["id"]

        # 2. Exceeding max discount cap raises error (default max_discount_pct is 30%)
        invalid_res = self.client.post(f"/merchant/offers/{merch1_id}", json={
            "title": "Excessive Discount Offer",
            "description": "Violates max discount",
            "discount_pct": 80.0,
            "base_price_inr": 200.0,
            "valid_minutes": 60,
            "max_redemptions": 20
        }, headers={"Authorization": f"Bearer {token1}"})
        self.assertEqual(invalid_res.status_code, 400)

        # 3. Ownership isolation guard: Merchant 2 cannot delete Merchant 1's offer
        del_res = self.client.delete(f"/merchant/offers/{merch1_id}/{offer_id}", headers={"Authorization": f"Bearer {token2}"})
        self.assertEqual(del_res.status_code, 403)

if __name__ == '__main__':
    unittest.main()
