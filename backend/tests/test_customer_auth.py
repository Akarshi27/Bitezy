import unittest
import time
from fastapi.testclient import TestClient

from backend.main import app
from backend.data_loader import get_data

class TestCustomerAuthSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_customer_registration_and_login(self):
        email = f"test_user_{int(time.time()*1000)}@bitezy.com"
        password = "securePassword123"

        # 1. Register new customer
        reg_payload = {
            "email": email,
            "password": password,
            "name": "Akarshi Test",
            "locality": "Koramangala",
            "language": "en",
            "budget": 350,
            "food_type": "veg",
            "declared_preferences": "south_indian,cafe"
        }
        res_reg = self.client.post("/auth/customer/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 200)
        data_reg = res_reg.json()
        self.assertIn("token", data_reg)
        self.assertIn("customer", data_reg)
        self.assertEqual(data_reg["customer"]["email"], email)
        self.assertNotIn("password_hash", data_reg["customer"])
        token = data_reg["token"]

        # 2. Duplicate email registration rejection
        res_dup = self.client.post("/auth/customer/register", json=reg_payload)
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("already registered", res_dup.json()["detail"].lower())

        # 3. Invalid password login
        res_bad_login = self.client.post("/auth/customer/login", json={"email": email, "password": "wrongPassword"})
        self.assertEqual(res_bad_login.status_code, 401)

        # 4. Successful login
        res_login = self.client.post("/auth/customer/login", json={"email": email, "password": password})
        self.assertEqual(res_login.status_code, 200)
        data_login = res_login.json()
        self.assertIn("token", data_login)
        self.assertEqual(data_login["customer"]["email"], email)
        token = data_login["token"]

        # 5. Fetch profile using authenticated token
        res_profile = self.client.get("/customer/profile/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_profile.status_code, 200)
        profile_data = res_profile.json()
        self.assertEqual(profile_data["email"], email)
        self.assertEqual(profile_data["locality"], "Koramangala")
        self.assertEqual(profile_data["budget"], 350)

        # 6. Update preferences & persist
        update_payload = {
            "budget": 450,
            "food_type": "non_veg",
            "locality": "Indiranagar",
            "declared_preferences": "biryani,fast_food"
        }
        res_update = self.client.put("/customer/profile/me", json=update_payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.json()
        self.assertEqual(updated["budget"], 450)
        self.assertEqual(updated["locality"], "Indiranagar")

        # Re-fetch profile to confirm persistence
        res_refetch = self.client.get("/customer/profile/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_refetch.status_code, 200)
        refetched = res_refetch.json()
        self.assertEqual(refetched["budget"], 450)
        self.assertEqual(refetched["locality"], "Indiranagar")
        self.assertEqual(refetched["declared_preferences"], "biryani,fast_food")

        # 7. Unauthorized access check
        res_no_token = self.client.get("/customer/profile/me")
        self.assertEqual(res_no_token.status_code, 401)

        res_invalid_token = self.client.get("/customer/profile/me", headers={"Authorization": "Bearer tok_invalid123"})
        self.assertEqual(res_invalid_token.status_code, 401)

        # 8. Logout & session destruction
        res_logout = self.client.post("/auth/customer/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_logout.status_code, 200)

        # Confirm token is now invalidated
        res_post_logout = self.client.get("/customer/profile/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_post_logout.status_code, 401)

if __name__ == "__main__":
    unittest.main()
