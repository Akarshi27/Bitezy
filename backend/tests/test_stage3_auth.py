import unittest
import time
from fastapi.testclient import TestClient

from backend.main import app
from backend.data_loader import get_data

class TestStage3AuthSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_customer_auth_flow(self):
        ts = int(time.time() * 1000)
        cust_email = f"cust_{ts}@bitezy.com"
        password = "strongPassword123"

        # 1. Customer registration
        reg_payload = {
            "email": cust_email,
            "password": password,
            "name": "Priya Sharma",
            "locality": "Koramangala",
            "language": "en",
            "marketing_consent": True,
            "food_type": "veg",
            "declared_preferences": "south_indian,cafe"
        }
        res_reg = self.client.post("/auth/customer/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 200)
        data_reg = res_reg.json()
        self.assertIn("token", data_reg)
        self.assertIn("customer", data_reg)
        self.assertEqual(data_reg["customer"]["email"], cust_email)
        self.assertNotIn("password_hash", data_reg["customer"])
        cust_token = data_reg["token"]

        # 2. Duplicate customer registration rejection
        res_dup = self.client.post("/auth/customer/register", json=reg_payload)
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("already registered", res_dup.json()["detail"].lower())

        # 3. Invalid password login
        res_bad_login = self.client.post("/auth/customer/login", json={"email": cust_email, "password": "wrong"})
        self.assertEqual(res_bad_login.status_code, 401)

        # 4. Valid customer login
        res_login = self.client.post("/auth/customer/login", json={"email": cust_email, "password": password})
        self.assertEqual(res_login.status_code, 200)
        self.assertIn("token", res_login.json())

        # 5. Logout
        res_logout = self.client.post("/auth/customer/logout", headers={"Authorization": f"Bearer {cust_token}"})
        self.assertEqual(res_logout.status_code, 200)

    def test_merchant_auth_flow(self):
        ts = int(time.time() * 1000)
        merch_email = f"merch_{ts}@cafe.com"
        password = "partnerSecret123"

        # 1. Merchant registration
        reg_payload = {
            "email": merch_email,
            "password": password,
            "name": "Little Fern Cafe",
            "owner_name": "Rohan Mehta",
            "phone": "+919876543210",
            "category": "cafe",
            "locality": "Indiranagar",
            "address": "12th Main Rd, Indiranagar"
        }
        res_reg = self.client.post("/auth/merchant/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 200)
        data_reg = res_reg.json()
        self.assertIn("token", data_reg)
        self.assertIn("merchant", data_reg)
        self.assertEqual(data_reg["merchant"]["email"], merch_email)
        self.assertNotIn("password_hash", data_reg["merchant"])
        merch_token = data_reg["token"]
        merch_id = data_reg["merchant"]["id"]

        # 2. Duplicate merchant registration rejection
        res_dup = self.client.post("/auth/merchant/register", json=reg_payload)
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("already registered", res_dup.json()["detail"].lower())

        # 3. Invalid merchant password login
        res_bad_login = self.client.post("/auth/merchant/login", json={"email": merch_email, "password": "wrong"})
        self.assertEqual(res_bad_login.status_code, 401)

        # 4. Valid merchant login
        res_login = self.client.post("/auth/merchant/login", json={"email": merch_email, "password": password})
        self.assertEqual(res_login.status_code, 200)
        self.assertIn("token", res_login.json())

        # 5. Merchant isolation check (Merchant A attempting to edit Merchant B's profile)
        res_cross_edit = self.client.put("/merchant/me/m_001", json={"name": "Hacked Name"}, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res_cross_edit.status_code, 403)

        # 6. Merchant editing own profile succeeds
        res_own_edit = self.client.put(f"/merchant/me/{merch_id}", json={"name": "Little Fern Cafe Updated"}, headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res_own_edit.status_code, 200)

        # 7. Merchant logout
        res_logout = self.client.post("/auth/merchant/logout", headers={"Authorization": f"Bearer {merch_token}"})
        self.assertEqual(res_logout.status_code, 200)

if __name__ == "__main__":
    unittest.main()
