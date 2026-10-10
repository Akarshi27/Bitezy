import unittest
from datetime import datetime
import pandas as pd

from backend.constraints import (
    check_consent, check_merchant_open, check_promo_window,
    check_distance, check_stock, check_budget, check_margin
)

class TestConstraints(unittest.TestCase):
    def test_consent(self):
        passed, _ = check_consent({'marketing_consent': False})
        self.assertFalse(passed)
        passed, _ = check_consent({'marketing_consent': True})
        self.assertTrue(passed)

    def test_merchant_open(self):
        merchant = {'open_hour': 10, 'close_hour': 22}
        dt_open = datetime(2026, 5, 18, 12, 0)
        dt_closed = datetime(2026, 5, 18, 23, 0)
        passed, _ = check_merchant_open(merchant, dt_open)
        self.assertTrue(passed)
        passed, _ = check_merchant_open(merchant, dt_closed)
        self.assertFalse(passed)

    def test_distance(self):
        # Coordinates: roughly 111km per degree
        passed, _, dist = check_distance(0, 0, 0, 0.01) # ~1110m
        self.assertTrue(passed)
        passed, _, dist = check_distance(0, 0, 0, 0.02) # ~2220m
        self.assertFalse(passed)
        
    def test_stock(self):
        items = [{'id': 1, 'stock_units': 0}, {'id': 2, 'stock_units': 5}]
        in_stock = check_stock(items)
        self.assertEqual(len(in_stock), 1)
        self.assertEqual(in_stock[0]['id'], 2)
        
    def test_budget(self):
        passed, _ = check_budget(150, 100)
        self.assertFalse(passed)
        passed, _ = check_budget(150, 200)
        self.assertTrue(passed)
        
    def test_margin(self):
        # price=100, unit_cost=50, min_margin=10% (55)
        # discount 40% -> final_price = 60 > 55 (passed)
        # discount 50% -> final_price = 50 < 55 (failed)
        passed, _, fp = check_margin(100, 50, 10, 40)
        self.assertTrue(passed)
        passed, _, fp = check_margin(100, 50, 10, 50)
        self.assertFalse(passed)

if __name__ == '__main__':
    unittest.main()
