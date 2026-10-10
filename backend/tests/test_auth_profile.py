"""
Tests for Customer and Merchant Profile /me endpoints.
Verifies GET /customer/profile/me, PUT /customer/profile/me,
GET /merchant/profile/me, and PUT /merchant/profile/me.
"""
import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.main import app

class TestAuthProfileSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Register a test customer
        self.cust_email = f"test_cust_{os.urandom(4).hex()}@example.com"
        c_res = self.client.post("/auth/customer/register", json={
            "name": "Profile Tester",
            "email": self.cust_email,
            "password": "password123",
            "locality": "Indiranagar",
            "language": "en"
        })
        self.assertEqual(c_res.status_code, 200)
        c_data = c_res.json()
        self.cust_token = c_data["token"]
        self.cust_id = c_data["customer"]["id"]

        # Register a test merchant
        self.merch_email = f"test_merch_{os.urandom(4).hex()}@example.com"
        m_res = self.client.post("/auth/merchant/register", json={
            "name": "Test Cafe",
            "owner_name": "Owner Bob",
            "email": self.merch_email,
            "password": "password123",
            "locality": "Koramangala",
            "category": "cafe"
        })
        self.assertEqual(m_res.status_code, 200)
        m_data = m_res.json()
        self.merch_token = m_data["token"]
        self.merch_id = m_data["merchant"]["id"]

    def test_get_customer_profile_me_success(self):
        res = self.client.get("/customer/profile/me", headers={"Authorization": f"Bearer {self.cust_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["email"], self.cust_email)
        self.assertEqual(data["name"], "Profile Tester")
        self.assertNotIn("password_hash", data)

    def test_get_customer_profile_me_unauthorized(self):
        res = self.client.get("/customer/profile/me")
        self.assertEqual(res.status_code, 401)

    def test_update_customer_profile_me_success(self):
        res = self.client.put("/customer/profile/me", json={
            "name": "Updated Profile Tester",
            "locality": "HSR Layout",
            "budget": 450.0
        }, headers={"Authorization": f"Bearer {self.cust_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["name"], "Updated Profile Tester")
        self.assertEqual(data["locality"], "HSR Layout")

    def test_get_merchant_profile_me_success(self):
        res = self.client.get("/merchant/profile/me", headers={"Authorization": f"Bearer {self.merch_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["email"], self.merch_email)
        self.assertEqual(data["name"], "Test Cafe")
        self.assertNotIn("password_hash", data)

    def test_get_merchant_profile_me_unauthorized(self):
        res = self.client.get("/merchant/profile/me")
        self.assertEqual(res.status_code, 401)

    def test_update_merchant_profile_me_success(self):
        res = self.client.put("/merchant/profile/me", json={
            "name": "Updated Test Cafe",
            "max_discount_pct": 35.0,
            "min_margin_pct": 18.0
        }, headers={"Authorization": f"Bearer {self.merch_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["name"], "Updated Test Cafe")
        self.assertEqual(data["max_discount_pct"], 35.0)

if __name__ == '__main__':
    unittest.main()
