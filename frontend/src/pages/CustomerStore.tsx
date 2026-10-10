import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Search,
  Sparkles,
  MapPin,
  Clock,
  Plus,
  Check,
  ShoppingBag,
  Info,
  X,
  Zap,
  Store,
  Wallet
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

interface CustomerStoreProps {
  activeCustomer: any
  cart: any[]
  onAddToCart: (item: any, discountPct?: number) => void
  onRemoveFromCart: (itemId: string) => void
  onClearCart: () => void
  isCartOpen: boolean
  onCloseCart: () => void
}

export default function CustomerStore({
  activeCustomer,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  isCartOpen,
  onCloseCart
}: CustomerStoreProps) {
  const [catalog, setCatalog] = useState<any[]>([])
  const [merchants, setMerchants] = useState<Record<string, any>>({})
  const [scenarios, setScenarios] = useState<any[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [vegOnly, setVegOnly] = useState(false)
  
  const [activeOfferDecision, setActiveOfferDecision] = useState<any | null>(null)
  const [loadingOffer, setLoadingOffer] = useState(false)
  
  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null)
  const [checkoutComplete, setCheckoutComplete] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeCustomer && scenarios.length > 0) {
      // Find matching scenario for this customer or default to cur_001
      const sc = scenarios.find(s => s.customer_id === activeCustomer.id) || scenarios[0]
      if (sc) runDecision(sc)
    }
  }, [activeCustomer, scenarios])

  const fetchData = async () => {
    try {
      const [catRes, mRes, scRes] = await Promise.all([
        axios.get(`${API_BASE}/data/catalog`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/data/merchants`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/data/scenarios`).catch(() => ({ data: [] }))
      ])

      if (Array.isArray(catRes.data)) setCatalog(catRes.data)
      
      if (Array.isArray(mRes.data)) {
        const mObj: Record<string, any> = {}
        mRes.data.forEach((m: any) => { mObj[m.id] = m })
        setMerchants(mObj)
      }

      if (Array.isArray(scRes.data)) setScenarios(scRes.data)

    } catch (err) {
      console.error('Error loading store data:', err)
    }
  }

  const runDecision = async (scenario: any) => {
    setLoadingOffer(true)
    try {
      const res = await axios.post(`${API_BASE}/decide`, scenario)
      setActiveOfferDecision(res.data)
    } catch (err) {
      console.error('Error fetching decision offer for store:', err)
    } finally {
      setLoadingOffer(false)
    }
  }

  // Filter products
  const filteredCatalog = catalog.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.tags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || 
                            item.category.toLowerCase().includes(selectedCategory.toLowerCase())
    
    const matchesVeg = !vegOnly || item.is_veg === 1

    return matchesSearch && matchesCategory && matchesVeg
  })

  // Cart total calculations
  const subtotal = cart.reduce((acc, item) => {
    const finalPrice = item.discountPct ? item.price_inr * (1 - item.discountPct / 100) : item.price_inr
    return acc + finalPrice
  }, 0)

  const handleCheckout = () => {
    setCheckoutComplete(true)
    setTimeout(() => {
      onClearCart()
      setCheckoutComplete(false)
      onCloseCart()
    }, 2500)
  }

  return (
    <div className="page-body fade-in" style={{ paddingBottom: '60px' }}>
      {/* Customer Persona & Location Greeting */}
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #162032 0%, #0d1424 100%)', borderColor: 'rgba(59,130,246,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
                Welcome, {activeCustomer?.name || 'Customer'}!
              </h2>
              <span className="badge badge-purple">{activeCustomer?.language || 'en'}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Hyperlocal Bengaluru Deals &bull; {activeCustomer?.locality || 'Indiranagar'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={16} style={{ color: 'var(--accent-green)' }} />
              <span>Wallet: <strong>₹{activeCustomer?.wallet_inr || 500}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${activeCustomer?.marketing_consent ? 'badge-green' : 'badge-red'}`}>
                {activeCustomer?.marketing_consent ? 'Marketing Opted-In' : 'Consent Opted-Out'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Decision Engine Offer Banner (Dynamic from FastAPI /decide) */}
      {loadingOffer ? (
        <div className="card" style={{ padding: '20px', textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          <Sparkles className="spinner" size={24} style={{ marginBottom: '8px' }} />
          <p>Evaluating AI decision engine offers for your location...</p>
        </div>
      ) : activeOfferDecision && activeOfferDecision.action === 'send' && activeOfferDecision.offer ? (
        <div className="offer-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-green"><Sparkles size={11} /> AI Decisioned Hyperlocal Offer</span>
                <span className="badge badge-amber font-mono">-{activeOfferDecision.offer.discount_pct}% OFF</span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                {activeOfferDecision.notification?.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '650px' }}>
                {activeOfferDecision.notification?.body}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const item = catalog.find(i => i.id === activeOfferDecision.offer.item_id)
                  if (item) {
                    onAddToCart(item, activeOfferDecision.offer.discount_pct)
                  }
                }}
              >
                <Zap size={16} /> {activeOfferDecision.notification?.cta || 'Claim & Add to Cart'}
              </button>

              {activeOfferDecision.ui_hints && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                  <span><MapPin size={12} style={{ inlineSize: '12px' }} /> {activeOfferDecision.ui_hints.distance_m}m away</span>
                  <span><Clock size={12} style={{ inlineSize: '12px' }} /> {activeOfferDecision.ui_hints.walk_minutes} min walk</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={18} style={{ color: 'var(--text-muted)' }} />
          <span>
            Standard Catalog Browsing: AI decision engine returned <strong>SKIP</strong> for current persona context ({activeOfferDecision?.reason || 'No active promotional window'}).
          </span>
        </div>
      )}

      {/* Catalog Search & Category Filter Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search dishes, drinks, bakery items, merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, textTransform: 'none', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span className="badge badge-green">Veg Only</span>
          </label>
        </div>

        {/* Category Chips */}
        <div className="filter-chips" style={{ margin: 0 }}>
          {['all', 'general', 'cafe', 'restaurant', 'bakery', 'dessert'].map(cat => (
            <button
              key={cat}
              className={`chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="section-title">
        <Store size={16} /> Available Items ({filteredCatalog.length})
      </div>

      <div className="grid-3">
        {filteredCatalog.map(item => {
          const merchant = merchants[item.merchant_id]
          const isOfferedItem = activeOfferDecision?.offer?.item_id === item.id
          const discountPct = isOfferedItem ? activeOfferDecision.offer.discount_pct : 0
          const finalPrice = discountPct ? roundTwo(item.price_inr * (1 - discountPct / 100)) : item.price_inr

          return (
            <div className="card" key={item.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
              {isOfferedItem && (
                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <span className="badge badge-amber font-mono">-{discountPct}% AI Offer</span>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span className={`badge ${item.is_veg ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px' }}>
                    {item.is_veg ? 'VEG' : 'NON-VEG'}
                  </span>
                  <span className="badge badge-blue">{item.category}</span>
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                  {item.title}
                </h4>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Merchant: <strong>{merchant?.name || item.merchant_id}</strong> ({merchant?.locality || 'Bengaluru'})
                </div>

                {item.tags && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {item.tags.split(',').map((tag: string) => (
                      <span className="tag" key={tag}>{tag.trim()}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="divider"></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {discountPct > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span className="font-mono text-green" style={{ fontSize: '18px', fontWeight: 800 }}>
                          ₹{finalPrice}
                        </span>
                        <span className="font-mono text-muted" style={{ textDecoration: 'line-through', fontSize: '12px' }}>
                          ₹{item.price_inr}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-primary" style={{ fontSize: '18px', fontWeight: 800 }}>
                        ₹{item.price_inr}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => setSelectedProductDetail({ item, merchant, discountPct, finalPrice })}
                    >
                      <Info size={14} />
                    </button>

                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                      onClick={() => onAddToCart(item, discountPct)}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Product Detail Quick View Modal */}
      {selectedProductDetail && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="card-elevated fade-in" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setSelectedProductDetail(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {selectedProductDetail.item.title}
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Merchant: <strong>{selectedProductDetail.merchant?.name}</strong> ({selectedProductDetail.merchant?.locality})
            </p>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div className="metric-row">
                <span className="metric-label">Base Price</span>
                <span className="metric-value font-mono">₹{selectedProductDetail.item.price_inr}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Stock Units</span>
                <span className="metric-value">{selectedProductDetail.item.stock_units}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Prep Time</span>
                <span className="metric-value">{selectedProductDetail.item.prep_minutes} min</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Merchant Occupancy</span>
                <span className="metric-value">{selectedProductDetail.merchant?.occupancy_pct}%</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                onAddToCart(selectedProductDetail.item, selectedProductDetail.discountPct)
                setSelectedProductDetail(null)
              }}
            >
              Add to Cart for ₹{selectedProductDetail.finalPrice}
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div className="card-elevated slide-in" style={{
            width: '100%',
            maxWidth: '400px',
            height: '100vh',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} /> Shopping Cart
                </h3>
                <button onClick={onCloseCart} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {checkoutComplete ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--accent-green)' }}>
                  <Check size={48} style={{ margin: '0 auto 16px' }} />
                  <h4 style={{ fontSize: '18px', fontWeight: 700 }}>Order Confirmed!</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Your hyperlocal offer order has been dispatched.
                  </p>
                </div>
              ) : cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {cart.map((cartItem, idx) => {
                    const finalP = cartItem.discountPct ? roundTwo(cartItem.price_inr * (1 - cartItem.discountPct / 100)) : cartItem.price_inr
                    return (
                      <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{cartItem.title}</div>
                          {cartItem.discountPct && (
                            <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                              -{cartItem.discountPct}% AI Discount
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="font-mono text-green" style={{ fontWeight: 700 }}>
                            ₹{finalP}
                          </span>
                          <button
                            onClick={() => onRemoveFromCart(cartItem.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!checkoutComplete && cart.length > 0 && (
              <div>
                <div className="divider"></div>
                <div className="metric-row" style={{ fontSize: '16px', fontWeight: 700 }}>
                  <span>Total Amount</span>
                  <span className="font-mono text-green">₹{roundTwo(subtotal)}</span>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                  onClick={handleCheckout}
                >
                  <Check size={16} /> Complete Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function roundTwo(val: number) {
  return Math.round(val * 100) / 100
}
