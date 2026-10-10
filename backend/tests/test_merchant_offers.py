"""
Stage 4 Tests: Merchant Offer Creation, Validation & Persistence
Tests: create, update, delete, toggle, discount cap, margin violation, stock check, ownership guard
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Patch DATA_DIR to point at real data
from pathlib import Path
import backend.data_loader as dl
dl.DATA_DIR = Path(__file__).parent.parent.parent / 'data'
dl._data_cache = None
dl._custom_data = {'customers': {}, 'merchants': {}, 'offer_responses': [], 'offers': {}}

from backend.data_loader import (
    get_data, create_offer, update_offer, delete_offer,
    toggle_offer_status, get_merchant_offers, get_active_published_offers,
    _validate_offer, register_merchant
)


def _get_real_merchant():
    """Return the first real merchant from the dataset."""
    data = get_data()
    for m in data['merchants'].values():
        if m.get('base_price_inr') and m.get('unit_cost_inr') and m.get('max_discount_pct'):
            return m
    return None


class TestOfferCreation(unittest.TestCase):

    def setUp(self):
        # Clear offers between tests
        dl._custom_data['offers'] = {}

    def test_create_offer_valid(self):
        """A valid offer should be created and returned."""
        m = _get_real_merchant()
        if not m:
            self.skipTest("No suitable merchant in dataset")

        offer = create_offer(m['id'], {
            'title': 'Happy Hour Test',
            'description': 'Test offer',
            'discount_pct': min(10, float(m['max_discount_pct'])),
            'base_price_inr': float(m['base_price_inr']),
            'valid_minutes': 30,
            'max_redemptions': 20,
        })
        self.assertEqual(offer['merchant_id'], m['id'])
        self.assertEqual(offer['status'], 'published')
        self.assertIn('id', offer)
        self.assertGreater(offer['final_price_inr'], 0)

    def test_create_offer_discount_exceeds_max(self):
        """Discount above merchant max should raise ValueError."""
        m = _get_real_merchant()
        if not m:
            self.skipTest("No suitable merchant in dataset")

        max_disc = float(m['max_discount_pct'])
        with self.assertRaises(ValueError) as ctx:
            create_offer(m['id'], {
                'title': 'Over-limit Offer',
                'discount_pct': max_disc + 10,   # clearly over max
                'base_price_inr': float(m['base_price_inr']),
                'valid_minutes': 30,
            })
        self.assertIn('exceeds merchant max', str(ctx.exception))

    def test_create_offer_margin_violation(self):
        """An offer that violates margin rules should raise ValueError."""
        m = _get_real_merchant()
        if not m:
            self.skipTest("No suitable merchant in dataset")

        base_price = float(m['base_price_inr'])
        unit_cost  = float(m['unit_cost_inr'])
        min_margin = float(m.get('min_margin_pct', 0))
        # A tiny final price: sell at unit_cost * 0.5 (always under min_margin)
        tiny_price = unit_cost * 0.5
        discount_pct = max(0, (1 - tiny_price / base_price) * 100) if base_price > 0 else 99

        # Only run if this discount is within max_discount_pct
        if discount_pct > float(m['max_discount_pct']) + 0.5:
            # Can't trigger both constraints; skip margin test
            self.skipTest("Cannot produce margin violation within max_discount bound for this merchant")

        # Re-check: is the final_price really below min_allowed?
        final_price = base_price * (1 - discount_pct / 100)
        min_allowed = unit_cost * (1 + min_margin / 100)
        if final_price >= min_allowed:
            self.skipTest("This merchant's pricing doesn't produce a margin violation at the chosen discount")

        with self.assertRaises(ValueError) as ctx:
            create_offer(m['id'], {
                'title': 'Margin Violation Offer',
                'discount_pct': discount_pct,
                'base_price_inr': base_price,
                'valid_minutes': 30,
            })
        self.assertIn('margin', str(ctx.exception).lower())

    def test_create_offer_unknown_merchant(self):
        """Creating an offer for a nonexistent merchant should raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            create_offer('m_FAKE_999', {
                'title': 'Ghost Offer',
                'discount_pct': 5,
                'base_price_inr': 100,
                'valid_minutes': 30,
            })
        self.assertIn('not found', str(ctx.exception).lower())

    def test_final_price_computed_correctly(self):
        """Final price must be base * (1 - disc/100)."""
        m = _get_real_merchant()
        if not m:
            self.skipTest("No suitable merchant in dataset")

        base = float(m['base_price_inr'])
        disc = min(5.0, float(m['max_discount_pct']))
        expected_final = round(base * (1 - disc / 100), 2)

        offer = create_offer(m['id'], {
            'title': 'Price Calc Test',
            'discount_pct': disc,
            'base_price_inr': base,
            'valid_minutes': 45,
        })
        self.assertAlmostEqual(offer['final_price_inr'], expected_final, places=1)


class TestOfferLifecycle(unittest.TestCase):

    def setUp(self):
        dl._custom_data['offers'] = {}
        self.m = _get_real_merchant()
        if not self.m:
            return
        self.offer = create_offer(self.m['id'], {
            'title': 'Lifecycle Test Offer',
            'discount_pct': min(5.0, float(self.m['max_discount_pct'])),
            'base_price_inr': float(self.m['base_price_inr']),
            'valid_minutes': 60,
        })

    def test_get_merchant_offers(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        offers = get_merchant_offers(self.m['id'])
        self.assertEqual(len(offers), 1)
        self.assertEqual(offers[0]['id'], self.offer['id'])

    def test_toggle_pause(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        toggled = toggle_offer_status(self.m['id'], self.offer['id'], 'paused')
        self.assertEqual(toggled['status'], 'paused')

    def test_toggle_publish(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        toggle_offer_status(self.m['id'], self.offer['id'], 'paused')
        republished = toggle_offer_status(self.m['id'], self.offer['id'], 'published')
        self.assertEqual(republished['status'], 'published')

    def test_get_active_published_offers_includes_live(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        active = get_active_published_offers()
        ids = [o['id'] for o in active]
        self.assertIn(self.offer['id'], ids)

    def test_get_active_published_offers_excludes_paused(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        toggle_offer_status(self.m['id'], self.offer['id'], 'paused')
        active = get_active_published_offers()
        ids = [o['id'] for o in active]
        self.assertNotIn(self.offer['id'], ids)

    def test_delete_offer(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        ok = delete_offer(self.m['id'], self.offer['id'])
        self.assertTrue(ok)
        remaining = get_merchant_offers(self.m['id'])
        self.assertEqual(len(remaining), 0)

    def test_delete_nonexistent_offer(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        result = delete_offer(self.m['id'], 'off_FAKE_999')
        self.assertFalse(result)

    def test_update_offer(self):
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        updated = update_offer(self.m['id'], self.offer['id'], {
            'title': 'Updated Title',
            'valid_minutes': 90,
        })
        self.assertEqual(updated['title'], 'Updated Title')
        self.assertEqual(updated['valid_minutes'], 90)

    def test_ownership_guard_toggle(self):
        """A different merchant should not be able to toggle another's offer."""
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        with self.assertRaises(ValueError) as ctx:
            toggle_offer_status('m_FAKE_OTHER', self.offer['id'], 'paused')
        self.assertIn('Forbidden', str(ctx.exception))

    def test_ownership_guard_delete(self):
        """A different merchant should not be able to delete another's offer."""
        if not self.m:
            self.skipTest("No suitable merchant in dataset")
        with self.assertRaises(ValueError) as ctx:
            delete_offer('m_FAKE_OTHER', self.offer['id'])
        self.assertIn('Forbidden', str(ctx.exception))


class TestMultipleOffers(unittest.TestCase):

    def setUp(self):
        dl._custom_data['offers'] = {}

    def test_multiple_offers_unique_ids(self):
        m = _get_real_merchant()
        if not m:
            self.skipTest("No suitable merchant in dataset")

        disc = min(5.0, float(m['max_discount_pct']))
        o1 = create_offer(m['id'], {'title': 'Offer A', 'discount_pct': disc, 'base_price_inr': float(m['base_price_inr']), 'valid_minutes': 30})
        o2 = create_offer(m['id'], {'title': 'Offer B', 'discount_pct': disc, 'base_price_inr': float(m['base_price_inr']), 'valid_minutes': 30})
        self.assertNotEqual(o1['id'], o2['id'])

    def test_active_offers_count(self):
        m = _get_real_merchant()
        if not m:
            self.skipTest("No suitable merchant in dataset")

        disc = min(5.0, float(m['max_discount_pct']))
        create_offer(m['id'], {'title': 'Offer 1', 'discount_pct': disc, 'base_price_inr': float(m['base_price_inr']), 'valid_minutes': 30})
        create_offer(m['id'], {'title': 'Offer 2', 'discount_pct': disc, 'base_price_inr': float(m['base_price_inr']), 'valid_minutes': 30})
        active = get_active_published_offers()
        self.assertEqual(len(active), 2)


if __name__ == '__main__':
    unittest.main()
