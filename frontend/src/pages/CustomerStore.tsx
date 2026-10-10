import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Search, MapPin, Clock, Tag, Zap, ShoppingBag, ChevronRight,
  X, Plus, CheckCircle, XCircle, Leaf, Flame as FlameIcon,
  Loader2
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

const CATEGORIES = [
  { key: 'all',         label: 'All',           emoji: '🍽️' },
  { key: 'cafe',        label: 'Cafe',           emoji: '☕' },
  { key: 'south_indian',label: 'South Indian',   emoji: '🥘' },
  { key: 'fast_food',   label: 'Fast Food',      emoji: '🍔' },
  { key: 'healthy',     label: 'Healthy',        emoji: '🥗' },
  { key: 'dessert',     label: 'Desserts',       emoji: '🍰' },
  { key: 'biryani',     label: 'Biryani',        emoji: '🍛' },
  { key: 'street_food', label: 'Street Food',    emoji: '🌮' },
]

const LOCALITIES = [
  'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield',
  'Marathahalli', 'BTM Layout', 'Jayanagar', 'Malleshwaram',
]

interface CustomerStoreProps {
  activeCustomer: any
  cart: any[]
  onAddToCart: (item: any, discountPct?: number) => void
  onRemoveFromCart: (id: string) => void
  onClearCart: () => void
  isCartOpen: boolean
  onCloseCart: () => void
}

export default function CustomerStore({
  activeCustomer, cart, onAddToCart, onRemoveFromCart, onClearCart, isCartOpen, onCloseCart
}: CustomerStoreProps) {
  const [merchants, setMerchants] = useState<any[]>([])
  const [catalog, setCatalog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [searchQ, setSearchQ] = useState('')

  // Craving modal
  const [cravingOpen, setCravingOpen] = useState(false)
  const [prefs, setPrefs] = useState({
    food_preference: 'anything',
    budget: 300,
    available_time: 30,
    food_type: 'both',
    max_distance_m: 2000,
    intent: '',
    lat: '',
    lng: '',
    locality: '',
  })
  const [recLoading, setRecLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'ok' | 'denied'>('idle')

  // Restaurant detail modal
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)
  const [merchantItems, setMerchantItems] = useState<any[]>([])
  const [merchantLoading, setMerchantLoading] = useState(false)

  // Location
  const [selectedLocality, setSelectedLocality] = useState(activeCustomer?.locality || 'Koramangala')

  // Checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutDone, setCheckoutDone] = useState(false)

  // Response record
  const [respondedOffers, setRespondedOffers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeCustomer?.locality) setSelectedLocality(activeCustomer.locality)
    if (activeCustomer?.declared_preferences) {
      const pref = activeCustomer.declared_preferences
      setPrefs(p => ({
        ...p,
        food_preference: pref.includes('south_indian') ? 'south_indian'
          : pref.includes('fast_food') ? 'fast_food'
          : pref.includes('healthy') ? 'healthy'
          : pref.includes('cafe') ? 'cafe' : 'anything',
        budget: activeCustomer.wallet_inr || 300,
        locality: activeCustomer.locality || '',
      }))
    }
  }, [activeCustomer])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mRes, cRes] = await Promise.all([
        axios.get(`${API_BASE}/data/merchants`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/data/catalog`).catch(() => ({ data: [] }))
      ])
      setMerchants(Array.isArray(mRes.data) ? mRes.data : [])
      setCatalog(Array.isArray(cRes.data) ? cRes.data : [])
    } finally {
      setLoading(false)
    }
  }

  const requestGeo = () => {
    setGeoStatus('requesting')
    if (!navigator.geolocation) { setGeoStatus('denied'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPrefs(p => ({ ...p, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }))
        setGeoStatus('ok')
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 }
    )
  }

  const handleGetRecommendations = async () => {
    if (!activeCustomer) return
    setRecLoading(true)
    setRecommendations([])

    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19)

    // Build lat/lng from customer or geo
    const lat = prefs.lat || activeCustomer?.current_lat || activeCustomer?.home_lat || 12.93595
    const lng = prefs.lng || activeCustomer?.current_lng || activeCustomer?.home_lng || 77.62484

    // Map food_preference to merchant categories
    const prefMap: Record<string, string[]> = {
      'south_indian': ['restaurant', 'south_indian'],
      'fast_food': ['fast_food', 'street_food'],
      'healthy': ['healthy', 'salad'],
      'cafe': ['cafe', 'beverage'],
      'anything': [],
    }
    const preferredCategories = prefMap[prefs.food_preference] || []

    // Decide which merchants are relevant
    const relevantMerchants = merchants.filter(m => {
      if (preferredCategories.length === 0) return true
      const cat = (m.category || '').toLowerCase()
      return preferredCategories.some(pc => cat.includes(pc))
    })

    const candidatesForDecide = (relevantMerchants.length > 0 ? relevantMerchants : merchants).slice(0, 8)
    const results: any[] = []

    for (const m of candidatesForDecide) {
      try {
        const scenario = {
          id: `storefront_${m.id}_${Date.now()}`,
          customer_id: activeCustomer.id,
          merchant_id: m.id,
          timestamp,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          minutes_available: prefs.available_time,
          wallet_override: prefs.budget,
          food_type: prefs.food_type,
          max_distance_m: prefs.max_distance_m,
          budget: prefs.budget,
          available_time: prefs.available_time,
          intent: [prefs.intent, prefs.food_preference, prefs.food_type === 'veg' ? 'vegetarian' : ''].filter(Boolean).join(' '),
        }
        const res = await axios.post(`${API_BASE}/decide`, scenario)
        if (res.data.action === 'send') {
          results.push({ ...res.data, merchant: m, scenario_id: scenario.id })
        }
      } catch { /* skip failed merchants */ }
    }

    setRecommendations(results)
    setRecLoading(false)
    setCravingOpen(false)
  }

  const handleOfferResponse = async (rec: any, action: 'accepted' | 'rejected') => {
    const offerId = rec.offer?.item_id || rec.scenario_id
    if (respondedOffers.has(offerId)) return
    setRespondedOffers(prev => new Set([...prev, offerId]))

    try {
      await axios.post(`${API_BASE}/offer/respond`, {
        offer_id: offerId,
        customer_id: activeCustomer?.id,
        merchant_id: rec.offer?.merchant_id,
        action,
        discount_pct: rec.offer?.discount_pct,
        final_price_inr: rec.offer?.final_price_inr,
      })
      if (action === 'accepted' && rec.offer) {
        const item = catalog.find(i => i.id === rec.offer.item_id)
        if (item) onAddToCart({ ...item, price_inr: rec.offer.final_price_inr }, rec.offer.discount_pct)
      }
    } catch { /* best effort */ }
  }

  const openMerchant = async (m: any) => {
    setSelectedMerchant(m)
    setMerchantLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/merchant/menu/${m.id}`)
      setMerchantItems(Array.isArray(res.data) ? res.data : [])
    } finally {
      setMerchantLoading(false)
    }
  }

  // Filter merchants for display
  const filteredMerchants = merchants.filter(m => {
    const cat = (m.category || '').toLowerCase()
    const name = (m.name || '').toLowerCase()
    const loc = (m.locality || '').toLowerCase()

    const catMatch = category === 'all' || cat.includes(category.replace('_', ' '))
    const searchMatch = !searchQ || name.includes(searchQ.toLowerCase()) || cat.includes(searchQ.toLowerCase()) || loc.includes(searchQ.toLowerCase())
    return catMatch && searchMatch
  })

  // Cart totals
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price_inr || 0), 0)
  const cartSavings = cart.reduce((acc, item) => {
    const original = catalog.find(c => c.id === item.id)
    if (original && original.price_inr > item.price_inr) return acc + (original.price_inr - item.price_inr)
    return acc
  }, 0)

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)' }}>

      {/* ── HERO BANNER ── */}
      <div className="bitezy-hero">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ maxWidth: 680 }}>
            <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, marginBottom: 12 }}>
              Discover your next{' '}
              <span style={{ color: 'var(--bitezy-red)' }}>craving</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', marginBottom: 24 }}>
              AI-powered personalized deals from cafés and restaurants near you in Bengaluru.
            </p>

            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 20, maxWidth: 560 }}>
              <Search size={18} style={{ marginLeft: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search for cafes, dishes, categories…"
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, padding: '13px 14px' }}
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', padding: '0 12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Location & CTA row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1.5px solid var(--border-default)', borderRadius: 10, padding: '8px 14px' }}>
                <MapPin size={16} style={{ color: 'var(--bitezy-red)', flexShrink: 0 }} />
                <select
                  value={selectedLocality}
                  onChange={e => setSelectedLocality(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none', width: 'auto', padding: 0 }}
                >
                  {LOCALITIES.map(l => <option key={l}>{l}, Bengaluru</option>)}
                </select>
              </div>

              <button className="btn btn-primary btn-lg" onClick={() => setCravingOpen(true)} style={{ gap: 8 }}>
                <Zap size={16} /> What are you craving?
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* ── RECOMMENDATIONS (if any) ── */}
        {recommendations.length > 0 && (
          <section style={{ marginBottom: 40 }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                  <Zap size={20} style={{ color: 'var(--bitezy-red)', marginRight: 8, verticalAlign: 'middle' }} />
                  Personalized Offers For You
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {recommendations.length} AI-matched offer{recommendations.length > 1 ? 's' : ''} based on your preferences
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setRecommendations([])}>
                <X size={14} /> Clear
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recommendations.map((rec, i) => {
                const offerId = rec.offer?.item_id || rec.scenario_id
                const responded = respondedOffers.has(offerId)
                const m = rec.merchant

                return (
                  <div key={i} className="card card-hover fade-in" style={{ animationDelay: `${i * 0.05}s`, borderLeft: '3px solid var(--bitezy-red)', padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 0 }}>
                      {/* Left: Merchant emoji banner */}
                      <div style={{
                        width: 100, flexShrink: 0,
                        background: 'linear-gradient(135deg, #1a0a0c, #2a1010)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 40
                      }}>
                        {m.category === 'cafe' ? '☕' : m.category === 'fast_food' ? '🍔' : m.category === 'healthy' ? '🥗' : '🍽️'}
                      </div>

                      <div style={{ flex: 1, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 800, fontSize: 16 }}>{m.name}</span>
                              <span className="badge badge-green" style={{ fontSize: 10 }}>AI Match</span>
                              {rec.offer?.discount_pct > 0 && (
                                <span className="discount-tag">{rec.offer.discount_pct}% OFF</span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                              {rec.notification?.body || rec.reason}
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              {rec.ui_hints?.distance_m != null && (
                                <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {rec.ui_hints.distance_m}m away</span>
                              )}
                              {rec.ui_hints?.walk_minutes != null && (
                                <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> ~{rec.ui_hints.walk_minutes} min walk</span>
                              )}
                              {rec.offer && (
                                <span>
                                  <Tag size={11} style={{ verticalAlign: 'middle' }} />{' '}
                                  {rec.offer.discount_pct > 0 ? (
                                    <>₹{rec.offer.final_price_inr?.toFixed(0)} <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>₹{catalog.find(c => c.id === rec.offer.item_id)?.price_inr?.toFixed(0) || '—'}</span></>
                                  ) : (
                                    <>₹{rec.offer.final_price_inr?.toFixed(0)}</>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {responded ? (
                              <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px' }}>Response recorded ✓</span>
                            ) : (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleOfferResponse(rec, 'accepted')}
                                  style={{ gap: 5 }}
                                >
                                  <CheckCircle size={13} /> Accept & Add to Cart
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleOfferResponse(rec, 'rejected')}
                                  style={{ gap: 5 }}
                                >
                                  <XCircle size={13} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {rec.reason && (
                          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: 6, fontStyle: 'italic' }}>
                            💡 {rec.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── CATEGORY TILES ── */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Browse by Category</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.key}
                className={`category-tile ${category === cat.key ? 'active' : ''}`}
                onClick={() => setCategory(cat.key)}
                style={{ minWidth: 90 }}
              >
                <span className="cat-emoji">{cat.emoji}</span>
                <span className="cat-label">{cat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── MERCHANTS GRID ── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>
              {category === 'all' ? 'Restaurants & Cafés Near You' : CATEGORIES.find(c => c.key === category)?.label + ' Near You'}
            </h2>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filteredMerchants.length} places</span>
          </div>

          {loading ? (
            <div className="grid-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 220, borderRadius: 12 }} />
              ))}
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">🔍</div>
              <h3>No results found</h3>
              <p>Try a different category or search term</p>
              <button className="btn btn-secondary btn-sm" onClick={() => { setCategory('all'); setSearchQ('') }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid-auto">
              {filteredMerchants.map((m, i) => (
                <MerchantCard
                  key={m.id}
                  merchant={m}
                  catalog={catalog}
                  delay={i * 0.03}
                  onClick={() => openMerchant(m)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── POPULAR DISHES ── */}
        {catalog.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Popular Dishes</h2>
            <div className="grid-auto-sm">
              {catalog.filter(i => i.stock_units > 0).slice(0, 12).map((item, i) => {
                const m = merchants.find(m => m.id === item.merchant_id)
                return (
                  <div key={item.id} className="food-card fade-in" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => m && openMerchant(m)}>
                    <div style={{ height: 100, background: `linear-gradient(135deg, #1a1015 0%, #0d1020 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
                      {item.is_veg ? '🌱' : '🍖'}
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{m?.name || 'Cafe'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, color: 'var(--bitezy-red)' }}>₹{item.price_inr}</span>
                        <span className={`badge ${item.is_veg ? 'badge-veg' : 'badge-nonveg'}`} style={{ fontSize: 9 }}>
                          {item.is_veg ? <Leaf size={9} /> : <FlameIcon size={9} />}
                          {item.is_veg ? 'VEG' : 'NON-VEG'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── CRAVING FORM MODAL ── */}
      {cravingOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCravingOpen(false)}>
          <div className="modal-box slide-up" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>What are you craving? <span style={{ color: 'var(--bitezy-red)' }}>🤤</span></h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Tell us your preferences — our AI will find the best deals</p>
              </div>
              <button onClick={() => setCravingOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Food Preference */}
              <div>
                <label>Food Preference</label>
                <div className="chip-group">
                  {[
                    { key: 'south_indian', label: '🥘 South Indian' },
                    { key: 'fast_food', label: '🍔 Fast Food' },
                    { key: 'healthy', label: '🥗 Healthy' },
                    { key: 'cafe', label: '☕ Cafe & Beverages' },
                    { key: 'anything', label: '🍽️ Anything' },
                  ].map(opt => (
                    <button key={opt.key} className={`chip ${prefs.food_preference === opt.key ? 'active' : ''}`} onClick={() => setPrefs(p => ({ ...p, food_preference: opt.key }))}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Budget</span>
                  <span style={{ color: 'var(--bitezy-red)', fontWeight: 800, fontSize: 14 }}>₹{prefs.budget}</span>
                </label>
                <input type="range" min={50} max={500} step={10} value={prefs.budget}
                  onChange={e => setPrefs(p => ({ ...p, budget: parseInt(e.target.value) }))} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>₹50</span><span>₹500</span>
                </div>
              </div>

              {/* Available Time */}
              <div>
                <label>Available Time</label>
                <div className="chip-group">
                  {[{ v: 10, l: '10 min' }, { v: 20, l: '20 min' }, { v: 30, l: '30 min' }, { v: 60, l: '1 hour' }].map(opt => (
                    <button key={opt.v} className={`chip ${prefs.available_time === opt.v ? 'active' : ''}`} onClick={() => setPrefs(p => ({ ...p, available_time: opt.v }))}>
                      <Clock size={12} /> {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary */}
              <div>
                <label>Dietary Preference</label>
                <div className="chip-group">
                  {[
                    { key: 'veg', label: '🌱 Vegetarian' },
                    { key: 'non_veg', label: '🍖 Non-Vegetarian' },
                    { key: 'both', label: '🍽️ Both' },
                  ].map(opt => (
                    <button key={opt.key} className={`chip ${prefs.food_type === opt.key ? 'active' : ''}`} onClick={() => setPrefs(p => ({ ...p, food_type: opt.key }))}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div>
                <label>Max Walking Distance</label>
                <div className="chip-group">
                  {[{ v: 500, l: '500m' }, { v: 1000, l: '1 km' }, { v: 2000, l: '2 km' }, { v: 9999, l: 'Anywhere' }].map(opt => (
                    <button key={opt.v} className={`chip ${prefs.max_distance_m === opt.v ? 'active' : ''}`} onClick={() => setPrefs(p => ({ ...p, max_distance_m: opt.v }))}>
                      <MapPin size={12} /> {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label>Your Location</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={prefs.locality || selectedLocality} onChange={e => setPrefs(p => ({ ...p, locality: e.target.value }))} style={{ flex: 1 }}>
                    {LOCALITIES.map(l => <option key={l}>{l}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={requestGeo} style={{ flexShrink: 0, gap: 5 }}>
                    {geoStatus === 'requesting' ? <Loader2 size={13} className="spinner" /> : <MapPin size={13} />}
                    {geoStatus === 'ok' ? '✓ GPS' : geoStatus === 'denied' ? 'Denied' : 'GPS'}
                  </button>
                </div>
              </div>

              {/* Free text */}
              <div>
                <label>Anything specific? (optional)</label>
                <input placeholder="e.g. dosa, filter coffee, biryani, sandwich…" value={prefs.intent} onChange={e => setPrefs(p => ({ ...p, intent: e.target.value }))} />
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ justifyContent: 'center' }}
                onClick={handleGetRecommendations}
                disabled={recLoading || !activeCustomer}
              >
                {recLoading ? <><Loader2 size={16} className="spinner" /> Finding deals…</> : <><Zap size={16} /> Get My Personalized Offers</>}
              </button>

              {!activeCustomer && (
                <p style={{ fontSize: 12, color: 'var(--bitezy-red)', textAlign: 'center' }}>Please select a customer profile or sign in first</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RESTAURANT DETAIL MODAL ── */}
      {selectedMerchant && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedMerchant(null)}>
          <div className="modal-box modal-lg slide-up" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{selectedMerchant.name}</h2>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>{selectedMerchant.category}</span>
                  <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {selectedMerchant.locality}</span>
                  <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {selectedMerchant.open_hour}:00 – {selectedMerchant.close_hour}:00</span>
                  {selectedMerchant.max_discount_pct > 0 && <span className="discount-tag">Up to {selectedMerchant.max_discount_pct}% off</span>}
                </div>
              </div>
              <button onClick={() => setSelectedMerchant(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}><X size={20} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {merchantLoading ? (
                <div className="loading-overlay"><Loader2 size={28} className="spinner" /><span>Loading menu…</span></div>
              ) : merchantItems.length === 0 ? (
                <div className="empty-state"><div className="emoji">🍽️</div><h3>No menu items</h3><p>This restaurant hasn't added their menu yet.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {merchantItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 10 }}>
                      <div style={{ width: 50, height: 50, borderRadius: 8, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                        {item.is_veg ? '🌱' : '🍖'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Prep: {item.prep_minutes} min • Stock: {item.stock_units}
                          {item.tags && <span> • {item.tags}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span className={`badge ${item.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>{item.is_veg ? 'VEG' : 'NON-VEG'}</span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--bitezy-red)' }}>₹{item.price_inr}</span>
                        {item.stock_units > 0 ? (
                          <button className="btn btn-primary btn-sm" onClick={() => onAddToCart(item)} style={{ gap: 4 }}>
                            <Plus size={13} /> Add
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 10px' }}>Out of stock</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CART DRAWER ── */}
      {isCartOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1499 }} onClick={onCloseCart} />
          <div className="cart-drawer">
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, fontSize: 18 }}>
                <ShoppingBag size={18} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--bitezy-red)' }} />
                Your Cart ({cart.length})
              </h3>
              <button onClick={onCloseCart} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="emoji" style={{ fontSize: 48 }}>🛒</div>
                  <h3>Your cart is empty</h3>
                  <p>Accept an offer or add items from a restaurant</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cart.map((item, idx) => {
                    const original = catalog.find(c => c.id === item.id)
                    return (
                      <div key={idx} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: 28, flexShrink: 0 }}>{item.is_veg ? '🌱' : '🍖'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, color: 'var(--bitezy-red)' }}>₹{item.price_inr?.toFixed(0)}</span>
                            {item.discountPct > 0 && original && (
                              <span style={{ textDecoration: 'line-through', fontSize: 12, color: 'var(--text-muted)' }}>₹{original.price_inr?.toFixed(0)}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => onRemoveFromCart(idx.toString())} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', alignSelf: 'flex-start' }}>
                          <X size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span><span>₹{cartSubtotal.toFixed(0)}</span>
                  </div>
                  {cartSavings > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--accent-green)' }}>
                      <span>Savings</span><span>-₹{cartSavings.toFixed(0)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                    <span>Total</span><span style={{ color: 'var(--bitezy-red)' }}>₹{(cartSubtotal).toFixed(0)}</span>
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setCheckoutOpen(true)}>
                  Proceed to Demo Checkout
                </button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => { onClearCart(); onCloseCart() }}>
                  Clear Cart
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── DEMO CHECKOUT MODAL ── */}
      {checkoutOpen && !checkoutDone && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-box modal-sm slide-up">
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Demo Checkout</h3>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--accent-amber)' }}>
              ⚠️ This is a demo experience. No real payment will be processed. No actual order will be placed.
            </div>
            <div style={{ marginBottom: 20, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items</span><span>{cart.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, fontSize: 16 }}>
                <span>Demo Total</span><span style={{ color: 'var(--bitezy-red)' }}>₹{cartSubtotal.toFixed(0)}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} onClick={() => { setCheckoutDone(true); setCheckoutOpen(false); onClearCart(); onCloseCart() }}>
              ✓ Simulate Demo Checkout
            </button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setCheckoutOpen(false)}>
              Back to Cart
            </button>
          </div>
        </div>
      )}

      {/* ── CHECKOUT SUCCESS ── */}
      {checkoutDone && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setCheckoutDone(false)}>
          <div className="modal-box modal-sm slide-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: 'var(--accent-green)' }}>Demo Order Placed!</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              This was a simulated checkout. In a real integration, your order would be sent to the restaurant.
            </p>
            <button className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setCheckoutDone(false)}>
              Continue Browsing
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MerchantCard({ merchant: m, catalog, delay, onClick }: any) {
  const items = catalog.filter((i: any) => i.merchant_id === m.id)
  const minPrice = items.length > 0 ? Math.min(...items.map((i: any) => i.price_inr)) : m.base_price_inr
  const emoji = m.category === 'cafe' ? '☕' : m.category?.includes('fast') ? '🍔' : m.category === 'healthy' ? '🥗' : m.category?.includes('biryani') ? '🍛' : '🍽️'

  return (
    <div className="restaurant-card fade-in" style={{ animationDelay: `${delay}s` }} onClick={onClick}>
      {/* Cover */}
      <div style={{
        height: 140, background: `linear-gradient(135deg, hsl(${(m.id?.charCodeAt(2) || 20) * 30 % 360}deg 20% 12%), #0d0f12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
        position: 'relative'
      }}>
        {emoji}
        {m.max_discount_pct > 0 && (
          <div className="discount-tag" style={{ position: 'absolute', top: 10, left: 10 }}>
            Up to {m.max_discount_pct}% off
          </div>
        )}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 8px',
          fontSize: 11, color: 'white', display: 'flex', alignItems: 'center', gap: 4
        }}>
          <Clock size={11} /> {m.open_hour}:00–{m.close_hour}:00
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          <span style={{ textTransform: 'capitalize' }}>{m.category}</span>
          <span>•</span>
          <MapPin size={11} />
          <span>{m.locality}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            From <strong style={{ color: 'var(--text-primary)' }}>₹{minPrice?.toFixed(0) || '—'}</strong>
          </span>
          <span style={{ fontSize: 12, color: 'var(--bitezy-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            View Menu <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  )
}
