import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Store,
  Utensils,
  BarChart3,
  ListOrdered,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Info,
  ShieldAlert,
  LogIn,
  Flame,
  Tag,
  Zap,
  Eye,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

const emptyOfferForm = {
  title: '',
  description: '',
  item_id: '',
  discount_pct: 10,
  base_price_inr: 200,
  valid_minutes: 60,
  max_redemptions: 50,
  expires_at: '',
}

export default function MerchantPortal() {
  const [merchantsList, setMerchantsList] = useState<any[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('m_001')

  const [merchantProfile, setMerchantProfile] = useState<any | null>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any | null>(null)

  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'promotions' | 'responses' | 'analytics'>('overview')
  const [loading, setLoading] = useState(false)

  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [newItemModal, setNewItemModal] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    title: '',
    category: 'general',
    price_inr: 150,
    unit_cost_inr: 60,
    stock_units: 15,
    prep_minutes: 10,
    is_veg: 1,
    tags: 'snack,vegetarian'
  })

  // Offer management state
  const [offers, setOffers] = useState<any[]>([])
  const [offerModal, setOfferModal] = useState<'create' | 'edit' | null>(null)
  const [editingOffer, setEditingOffer] = useState<any | null>(null)
  const [offerForm, setOfferForm] = useState({ ...emptyOfferForm })
  const [offerError, setOfferError] = useState('')
  const [offerLoading, setOfferLoading] = useState(false)

  // Preview panel
  const [showPreview, setShowPreview] = useState(false)

  // Merchant Auth state
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [loggedInMerchant, setLoggedInMerchant] = useState<any | null>(null)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', category: 'cafe', locality: 'Koramangala' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Auth token
  const getToken = () => localStorage.getItem('bitezy_merchant_token') || ''

  const handleMerchantLogin = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const res = await axios.post(`${API_BASE}/auth/merchant/login`, { email: authForm.email, password: authForm.password })
      const { token, merchant } = res.data
      localStorage.setItem('bitezy_merchant_token', token)
      setLoggedInMerchant(merchant)
      setSelectedMerchantId(merchant.id)
      setAuthModal(null)
    } catch (e: any) { setAuthError(e.response?.data?.detail || 'Login failed') }
    finally { setAuthLoading(false) }
  }

  const handleMerchantSignup = async () => {
    if (!authForm.name || !authForm.email || !authForm.password) { setAuthError('All fields required'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const res = await axios.post(`${API_BASE}/auth/merchant/register`, authForm)
      const { token, merchant } = res.data
      localStorage.setItem('bitezy_merchant_token', token)
      setLoggedInMerchant(merchant)
      setSelectedMerchantId(merchant.id)
      setAuthModal(null)
    } catch (e: any) { setAuthError(e.response?.data?.detail || 'Signup failed') }
    finally { setAuthLoading(false) }
  }

  const handleLogout = async () => {
    const token = getToken()
    if (token) {
      try { await axios.post(`${API_BASE}/auth/merchant/logout`, {}, { headers: { Authorization: token } }) } catch { /* ignore */ }
    }
    localStorage.removeItem('bitezy_merchant_token')
    setLoggedInMerchant(null)
  }

  useEffect(() => {
    fetchMerchantsList()
    // Restore session
    const savedToken = localStorage.getItem('bitezy_merchant_token')
    if (savedToken) {
      // Token exists but we don't know the merchant; load lazily
    }
  }, [])

  useEffect(() => {
    if (selectedMerchantId) {
      loadMerchantData(selectedMerchantId)
    }
  }, [selectedMerchantId])

  const fetchMerchantsList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/data/merchants`).catch(() => ({ data: [] }))
      if (Array.isArray(res.data) && res.data.length > 0) {
        setMerchantsList(res.data)
      }
    } catch (err) {
      console.error('Error fetching merchants list:', err)
    }
  }

  const loadMerchantData = async (mId: string) => {
    setLoading(true)
    try {
      const [profRes, menuRes, anaRes, offRes] = await Promise.all([
        axios.get(`${API_BASE}/merchant/me/${mId}`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/merchant/menu/${mId}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/merchant/analytics/${mId}`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/merchant/offers/${mId}`).catch(() => ({ data: [] })),
      ])

      if (profRes.data) setMerchantProfile(profRes.data)
      if (Array.isArray(menuRes.data)) setMenuItems(menuRes.data)
      if (anaRes.data) setAnalytics(anaRes.data)
      if (Array.isArray(offRes.data)) setOffers(offRes.data)

    } catch (err) {
      console.error('Error loading merchant data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    try {
      await axios.post(`${API_BASE}/merchant/menu/${selectedMerchantId}/add`, newItemForm)
      setNewItemModal(false)
      setNewItemForm({ title: '', category: 'general', price_inr: 150, unit_cost_inr: 60, stock_units: 15, prep_minutes: 10, is_veg: 1, tags: 'snack,vegetarian' })
      loadMerchantData(selectedMerchantId)
    } catch (err) {
      console.error('Error adding item:', err)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return
    try {
      await axios.put(`${API_BASE}/merchant/menu/${selectedMerchantId}/item/${editingItem.id}`, editingItem)
      setEditingItem(null)
      loadMerchantData(selectedMerchantId)
    } catch (err) {
      console.error('Error updating item:', err)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    try {
      await axios.delete(`${API_BASE}/merchant/menu/${selectedMerchantId}/item/${itemId}`)
      loadMerchantData(selectedMerchantId)
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  // ── Offer handlers ──────────────────────────────────────────────────────

  const openCreateOffer = () => {
    setOfferForm({ ...emptyOfferForm, base_price_inr: merchantProfile?.base_price_inr || 200 })
    setEditingOffer(null)
    setOfferError('')
    setShowPreview(false)
    setOfferModal('create')
  }

  const openEditOffer = (offer: any) => {
    setOfferForm({
      title: offer.title,
      description: offer.description || '',
      item_id: offer.item_id || '',
      discount_pct: offer.discount_pct,
      base_price_inr: offer.base_price_inr,
      valid_minutes: offer.valid_minutes,
      max_redemptions: offer.max_redemptions,
      expires_at: offer.expires_at || '',
    })
    setEditingOffer(offer)
    setOfferError('')
    setShowPreview(false)
    setOfferModal('edit')
  }

  const handleCreateOffer = async () => {
    const token = getToken()
    if (!token) { setOfferError('Please sign in to publish offers'); return }
    setOfferLoading(true); setOfferError('')
    try {
      await axios.post(`${API_BASE}/merchant/offers/${selectedMerchantId}`, offerForm, { headers: { Authorization: token } })
      setOfferModal(null)
      loadMerchantData(selectedMerchantId)
    } catch (e: any) { setOfferError(e.response?.data?.detail || 'Failed to create offer') }
    finally { setOfferLoading(false) }
  }

  const handleUpdateOffer = async () => {
    if (!editingOffer) return
    const token = getToken()
    if (!token) { setOfferError('Please sign in to update offers'); return }
    setOfferLoading(true); setOfferError('')
    try {
      await axios.put(`${API_BASE}/merchant/offers/${selectedMerchantId}/${editingOffer.id}`, offerForm, { headers: { Authorization: token } })
      setOfferModal(null)
      setEditingOffer(null)
      loadMerchantData(selectedMerchantId)
    } catch (e: any) { setOfferError(e.response?.data?.detail || 'Failed to update offer') }
    finally { setOfferLoading(false) }
  }

  const handleToggleStatus = async (offer: any) => {
    const token = getToken()
    if (!token) return
    const newStatus = offer.status === 'published' ? 'paused' : 'published'
    try {
      await axios.patch(`${API_BASE}/merchant/offers/${selectedMerchantId}/${offer.id}/status`,
        { status: newStatus }, { headers: { Authorization: token } })
      loadMerchantData(selectedMerchantId)
    } catch (e: any) { console.error('Toggle failed', e) }
  }

  const handleDeleteOffer = async (offer: any) => {
    if (!confirm(`Delete offer "${offer.title}"?`)) return
    const token = getToken()
    if (!token) return
    try {
      await axios.delete(`${API_BASE}/merchant/offers/${selectedMerchantId}/${offer.id}`, { headers: { Authorization: token } })
      loadMerchantData(selectedMerchantId)
    } catch (e: any) { console.error('Delete failed', e) }
  }

  // Live preview notification
  const finalPreviewPrice = Math.round(offerForm.base_price_inr * (1 - offerForm.discount_pct / 100))
  const previewNotif = {
    title: `🔥 ${offerForm.discount_pct}% OFF at ${merchantProfile?.name || 'our café'}!`,
    body: `${offerForm.title || 'Special Deal'} — only ₹${finalPreviewPrice}. ${offerForm.description || ''}`,
    cta: 'Grab it now →',
  }

  const activeOffers = offers.filter(o => o.status === 'published')
  const pausedOffers = offers.filter(o => o.status !== 'published')

  return (
    <div className="page-body fade-in">
      {/* Merchant Selector Bar */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Store size={24} style={{ color: 'var(--bitezy-red)' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
              {merchantProfile?.name || 'Bitezy Partner Hub'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Locality: {merchantProfile?.locality || 'Bengaluru'} • Category: {merchantProfile?.category || 'Cafe'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {loggedInMerchant ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bitezy-red-light)', border: '1px solid rgba(226,55,68,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}>
              <Flame size={14} style={{ color: 'var(--bitezy-red)' }} />
              <span style={{ color: 'var(--bitezy-red)', fontWeight: 700 }}>{loggedInMerchant.name}</span>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 4 }}><X size={13} /></button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => { setAuthTab('login'); setAuthModal('login'); setAuthError('') }} style={{ gap: 5 }}>
              <LogIn size={13} /> Partner Sign In
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Demo Merchant:</span>
          <select value={selectedMerchantId} onChange={(e) => setSelectedMerchantId(e.target.value)} style={{ width: 'auto', minWidth: '220px' }}>
            {merchantsList.map(m => (
              <option key={m.id} value={m.id}>{m.id} - {m.name} ({m.category})</option>
            ))}
          </select>

          <button className="btn btn-ghost" onClick={() => loadMerchantData(selectedMerchantId)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Merchant Auth Modal */}
      {authModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAuthModal(null)}>
          <div className="modal-box modal-sm slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flame size={20} style={{ color: 'var(--bitezy-red)' }} />
                <span style={{ fontWeight: 900, fontSize: 18 }}>Bitezy Partner Hub</span>
              </div>
              <button onClick={() => setAuthModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: 20, gap: 4 }}>
              {(['login', 'signup'] as const).map(tab => (
                <button key={tab} onClick={() => setAuthTab(tab)} style={{
                  flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 700,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: authTab === tab ? 'var(--bitezy-red)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${authTab === tab ? 'var(--bitezy-red)' : 'transparent'}`,
                  marginBottom: -1
                }}>
                  {tab === 'login' ? 'Sign In' : 'Register Cafe'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {authTab === 'signup' && (
                <>
                  <div><label>Cafe / Restaurant Name</label><input value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Little Fern Café" /></div>
                  <div><label>Category</label>
                    <select value={authForm.category} onChange={e => setAuthForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="cafe">Cafe</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="fast_food">Fast Food</option>
                      <option value="healthy">Healthy / Salad</option>
                    </select>
                  </div>
                  <div><label>Locality</label>
                    <select value={authForm.locality} onChange={e => setAuthForm(f => ({ ...f, locality: e.target.value }))}>
                      {['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Marathahalli', 'BTM Layout'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div><label>Email</label><input type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} placeholder="owner@cafe.com" /></div>
              <div><label>Password</label><input type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></div>

              {authError && <div style={{ background: 'var(--bitezy-red-light)', border: '1px solid rgba(226,55,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--bitezy-red)' }}>{authError}</div>}

              <button className="btn btn-primary btn-lg" onClick={authTab === 'login' ? handleMerchantLogin : handleMerchantSignup} disabled={authLoading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {authLoading ? '…' : authTab === 'login' ? 'Sign In to Partner Hub' : 'Register My Cafe'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                {authTab === 'login' ? "New partner? " : "Already registered? "}
                <span style={{ color: 'var(--bitezy-red)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setAuthTab(authTab === 'login' ? 'signup' : 'login')}>
                  {authTab === 'login' ? 'Register' : 'Sign in'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('overview')}>
          <Store size={16} /> Profile &amp; Operating Rules
        </button>
        <button className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('menu')}>
          <Utensils size={16} /> Live Menu Management ({menuItems.length})
        </button>
        <button className={`btn ${activeTab === 'promotions' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('promotions')}
          style={{ position: 'relative' }}>
          <Tag size={16} /> Offers &amp; Promotions
          {activeOffers.length > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bitezy-red)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{activeOffers.length}</span>
          )}
        </button>
        <button className={`btn ${activeTab === 'responses' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('responses')}>
          <ListOrdered size={16} /> Customer Responses ({analytics?.offers_sent || 0})
        </button>
        <button className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('analytics')}>
          <BarChart3 size={16} /> Real-Time Analytics
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay card">
          <RefreshCw className="spinner" size={32} />
          <p>Loading merchant data...</p>
        </div>
      ) : (
        <div>
          {/* Tab 1: Profile & Operating Rules */}
          {activeTab === 'overview' && merchantProfile && (
            <div className="grid-2 fade-in">
              <div className="card-elevated">
                <div className="section-title">
                  <Store size={16} /> Cafe Profile &amp; Hours
                </div>
                <div className="grid-2">
                  <div className="metric-row">
                    <span className="metric-label">Operating Hours</span>
                    <span className="metric-value font-mono">{merchantProfile.open_hour}:00 - {merchantProfile.close_hour}:00</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Promo Window</span>
                    <span className="metric-value font-mono">{merchantProfile.promo_start_hour ? `${merchantProfile.promo_start_hour}:00 - ${merchantProfile.promo_end_hour}:00` : 'All Day'}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Current Occupancy</span>
                    <span className="metric-value">{merchantProfile.occupancy_pct}%</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Seating Capacity</span>
                    <span className="metric-value">{merchantProfile.capacity} seats</span>
                  </div>
                </div>
              </div>

              <div className="card-elevated">
                <div className="section-title">
                  <ShieldAlert size={16} /> Margin &amp; Discount Guardrails
                </div>
                <div className="grid-2">
                  <div className="metric-row">
                    <span className="metric-label">Max Discount Allowed</span>
                    <span className="metric-value text-amber font-mono">{merchantProfile.max_discount_pct}%</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Min Profit Margin Limit</span>
                    <span className="metric-value text-green font-mono">{merchantProfile.min_margin_pct}%</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Base Item Price</span>
                    <span className="metric-value font-mono">₹{merchantProfile.base_price_inr}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Unit Production Cost</span>
                    <span className="metric-value font-mono">₹{merchantProfile.unit_cost_inr}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Live Menu Management */}
          {activeTab === 'menu' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="section-title" style={{ margin: 0 }}>
                  <Utensils size={16} /> Menu Items Directory
                </div>
                <button className="btn btn-primary" onClick={() => setNewItemModal(true)}>
                  <Plus size={16} /> Add New Dish / Drink
                </button>
              </div>

              <div className="card" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Title</th><th>Category</th><th>Dietary</th>
                      <th>Selling Price</th><th>Stock Units</th><th>Prep Time</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td className="font-mono text-accent">{item.id}</td>
                        <td className="font-semibold">{item.title}</td>
                        <td><span className="badge badge-blue">{item.category}</span></td>
                        <td><span className={`badge ${item.is_veg ? 'badge-green' : 'badge-red'}`}>{item.is_veg ? 'VEG' : 'NON-VEG'}</span></td>
                        <td className="font-mono text-green">₹{item.price_inr}</td>
                        <td className="font-mono">{item.stock_units} units</td>
                        <td className="font-mono">{item.prep_minutes} min</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setEditingItem({ ...item })}>
                              <Edit2 size={12} /> Edit
                            </button>
                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Offers & Promotions */}
          {activeTab === 'promotions' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div className="section-title" style={{ margin: 0 }}>
                    <Tag size={16} /> Offers &amp; Promotions
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Published offers appear on the Bitezy Customer Storefront in real-time. Guardrails enforce max discount &amp; margin limits.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateOffer}>
                  <Plus size={16} /> Create &amp; Publish Offer
                </button>
              </div>

              {!loggedInMerchant && (
                <div style={{ background: 'var(--bitezy-red-light)', border: '1px solid rgba(226,55,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertTriangle size={18} style={{ color: 'var(--bitezy-red)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--bitezy-red)', fontSize: 14 }}>Sign in to publish offers</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Only authenticated merchants can create and manage offers. <span style={{ color: 'var(--bitezy-red)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setAuthTab('login'); setAuthModal('login') }}>Sign in →</span></div>
                  </div>
                </div>
              )}

              {/* Active Offers */}
              {activeOffers.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} style={{ color: '#27ae60' }} />
                    LIVE OFFERS ({activeOffers.length})
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {activeOffers.map(offer => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        onEdit={() => openEditOffer(offer)}
                        onToggle={() => handleToggleStatus(offer)}
                        onDelete={() => handleDeleteOffer(offer)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Paused / Draft Offers */}
              {pausedOffers.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PauseCircle size={14} style={{ color: 'var(--text-muted)' }} />
                    PAUSED / DRAFT ({pausedOffers.length})
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {pausedOffers.map(offer => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        onEdit={() => openEditOffer(offer)}
                        onToggle={() => handleToggleStatus(offer)}
                        onDelete={() => handleDeleteOffer(offer)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {offers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Tag size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No offers yet</p>
                  <p style={{ fontSize: 13 }}>Create your first offer to appear on the Bitezy Customer Storefront!</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Customer Responses */}
          {activeTab === 'responses' && (
            <div className="card fade-in" style={{ overflowX: 'auto' }}>
              <div className="section-title">
                <ListOrdered size={16} /> Real-Time Customer Response Log
              </div>
              {!analytics?.responses?.length ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Info size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p>No customer responses recorded yet. Test offers on the Storefront or Simulator!</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Offer ID</th><th>Customer ID</th><th>Merchant ID</th><th>Action Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.responses?.map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-mono text-accent">{r.offer_id || 'N/A'}</td>
                        <td>{r.customer_id || 'N/A'}</td>
                        <td>{r.merchant_id}</td>
                        <td>
                          <span className={`badge ${r.action === 'accepted' ? 'badge-green' : 'badge-red'}`}>
                            {r.action.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 5: Analytics */}
          {activeTab === 'analytics' && analytics && (
            <div className="fade-in">
              <div className="grid-4" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <div className="stat-value text-accent">{analytics.offers_sent}</div>
                  <div className="stat-label">Total Offers Sent</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-green">{analytics.accepted_count}</div>
                  <div className="stat-label">Offers Accepted</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-red">{analytics.rejected_count}</div>
                  <div className="stat-label">Offers Rejected</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-amber">{analytics.acceptance_rate_pct}%</div>
                  <div className="stat-label">Customer Acceptance Rate</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Offer Modal */}
      {offerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOfferModal(null)}>
          <div className="modal-box slide-up" style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={20} style={{ color: 'var(--bitezy-red)' }} />
                <span style={{ fontWeight: 900, fontSize: 18 }}>
                  {offerModal === 'create' ? 'Create & Publish Offer' : 'Edit Offer'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye size={14} /> {showPreview ? 'Hide' : 'Preview'}
                </button>
                <button onClick={() => setOfferModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 20 }}>
              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label>Offer Title *</label>
                  <input value={offerForm.title} onChange={e => setOfferForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Happy Hour Special" />
                </div>
                <div>
                  <label>Description</label>
                  <input value={offerForm.description} onChange={e => setOfferForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description for customers" />
                </div>

                <div className="grid-2">
                  <div>
                    <label>Discount % (max {merchantProfile?.max_discount_pct || 30}%)</label>
                    <input type="number" min={0} max={merchantProfile?.max_discount_pct || 100}
                      value={offerForm.discount_pct}
                      onChange={e => setOfferForm(f => ({ ...f, discount_pct: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label>Base Price (₹)</label>
                    <input type="number" value={offerForm.base_price_inr}
                      onChange={e => setOfferForm(f => ({ ...f, base_price_inr: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label>Valid Duration (minutes)</label>
                    <input type="number" value={offerForm.valid_minutes}
                      onChange={e => setOfferForm(f => ({ ...f, valid_minutes: parseInt(e.target.value) || 30 }))} />
                  </div>
                  <div>
                    <label>Max Redemptions</label>
                    <input type="number" value={offerForm.max_redemptions}
                      onChange={e => setOfferForm(f => ({ ...f, max_redemptions: parseInt(e.target.value) || 10 }))} />
                  </div>
                </div>

                <div>
                  <label>Link to Menu Item ID (optional)</label>
                  <select value={offerForm.item_id} onChange={e => setOfferForm(f => ({ ...f, item_id: e.target.value }))}>
                    <option value="">— Any item —</option>
                    {menuItems.map(i => <option key={i.id} value={i.id}>{i.title} (₹{i.price_inr})</option>)}
                  </select>
                </div>

                <div>
                  <label>Offer Expiry (leave blank = no expiry)</label>
                  <input type="datetime-local" value={offerForm.expires_at}
                    onChange={e => setOfferForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>

                {/* Final price display */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Original price</span>
                    <span>₹{offerForm.base_price_inr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
                    <span style={{ color: 'var(--bitezy-red)', fontWeight: 700 }}>-{offerForm.discount_pct}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>Customer pays</span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#27ae60' }}>₹{finalPreviewPrice}</span>
                  </div>
                </div>

                {offerError && (
                  <div style={{ background: 'var(--bitezy-red-light)', border: '1px solid rgba(226,55,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--bitezy-red)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    {offerError}
                  </div>
                )}

                <button className="btn btn-primary btn-lg"
                  onClick={offerModal === 'create' ? handleCreateOffer : handleUpdateOffer}
                  disabled={offerLoading || !offerForm.title}
                  style={{ width: '100%', justifyContent: 'center' }}>
                  {offerLoading ? <><RefreshCw size={14} className="spinner" /> Processing…</> :
                    offerModal === 'create' ? <><Zap size={16} /> Publish Offer Now</> : <><Zap size={16} /> Update Offer</>}
                </button>
              </div>

              {/* Notification Preview */}
              {showPreview && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>📱 Customer Notification Preview</div>

                  {/* Phone mockup */}
                  <div style={{ background: '#1a1a2e', borderRadius: 24, padding: '20px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, background: 'var(--bitezy-red)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Flame size={18} style={{ color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Bitezy</div>
                        <div style={{ color: '#888', fontSize: 11 }}>just now</div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{previewNotif.title}</div>
                      <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>{previewNotif.body}</div>
                      <button style={{ background: 'var(--bitezy-red)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                        {previewNotif.cta}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    <div>✅ Merchant name in notification body</div>
                    <div>✅ Language: English (en)</div>
                    <div>✅ Discount: {offerForm.discount_pct}% ≤ max {merchantProfile?.max_discount_pct}%</div>
                    <div style={{ color: finalPreviewPrice >= (merchantProfile?.unit_cost_inr || 0) * 1.15 ? 'var(--text-muted)' : 'var(--bitezy-red)' }}>
                      {finalPreviewPrice >= (merchantProfile?.unit_cost_inr || 0) * 1.15 ? '✅' : '⚠️'} Margin check: ₹{finalPreviewPrice} final
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {newItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="card-elevated fade-in" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add New Dish / Drink</h3>
              <button onClick={() => setNewItemModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div><label>Item Title</label><input type="text" value={newItemForm.title} onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })} placeholder="e.g. Masala Dosa & Filter Coffee" /></div>
              <div className="grid-2">
                <div><label>Selling Price (₹)</label><input type="number" value={newItemForm.price_inr} onChange={(e) => setNewItemForm({ ...newItemForm, price_inr: parseFloat(e.target.value) || 0 })} /></div>
                <div><label>Unit Cost (₹)</label><input type="number" value={newItemForm.unit_cost_inr} onChange={(e) => setNewItemForm({ ...newItemForm, unit_cost_inr: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid-2">
                <div><label>Stock Units</label><input type="number" value={newItemForm.stock_units} onChange={(e) => setNewItemForm({ ...newItemForm, stock_units: parseInt(e.target.value) || 0 })} /></div>
                <div><label>Prep Time (min)</label><input type="number" value={newItemForm.prep_minutes} onChange={(e) => setNewItemForm({ ...newItemForm, prep_minutes: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div><label>Dietary Type</label>
                <select value={newItemForm.is_veg} onChange={(e) => setNewItemForm({ ...newItemForm, is_veg: parseInt(e.target.value) })}>
                  <option value={1}>Vegetarian (VEG)</option>
                  <option value={0}>Non-Vegetarian (NON-VEG)</option>
                </select>
              </div>
              <div><label>Tags (comma separated)</label><input type="text" value={newItemForm.tags} onChange={(e) => setNewItemForm({ ...newItemForm, tags: e.target.value })} placeholder="e.g. south_indian,breakfast,popular" /></div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAddItem}>Save to Menu Directory</button>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="card-elevated fade-in" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Edit Item ({editingItem.id})</h3>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div><label>Item Title</label><input type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} /></div>
              <div className="grid-2">
                <div><label>Selling Price (₹)</label><input type="number" value={editingItem.price_inr} onChange={(e) => setEditingItem({ ...editingItem, price_inr: parseFloat(e.target.value) || 0 })} /></div>
                <div><label>Stock Units</label><input type="number" value={editingItem.stock_units} onChange={(e) => setEditingItem({ ...editingItem, stock_units: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid-2">
                <div><label>Prep Time (min)</label><input type="number" value={editingItem.prep_minutes} onChange={(e) => setEditingItem({ ...editingItem, prep_minutes: parseInt(e.target.value) || 0 })} /></div>
                <div><label>Dietary Type</label>
                  <select value={editingItem.is_veg} onChange={(e) => setEditingItem({ ...editingItem, is_veg: parseInt(e.target.value) })}>
                    <option value={1}>Vegetarian (VEG)</option>
                    <option value={0}>Non-Vegetarian (NON-VEG)</option>
                  </select>
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleUpdateItem}>Update Item</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Offer Card Sub-Component ──────────────────────────────────────────────

function OfferCard({ offer, onEdit, onToggle, onDelete }: {
  offer: any
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const isLive = offer.status === 'published'
  const redemptionPct = Math.round((offer.redemptions / Math.max(1, offer.max_redemptions)) * 100)

  return (
    <div style={{
      background: isLive ? 'linear-gradient(135deg, rgba(226,55,68,0.04), rgba(226,55,68,0.01))' : 'var(--bg-secondary)',
      border: isLive ? '1px solid rgba(226,55,68,0.25)' : '1px solid var(--border-default)',
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      {/* Status badge */}
      <div style={{
        padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
        background: isLive ? 'rgba(39,174,96,0.12)' : 'rgba(0,0,0,0.06)',
        color: isLive ? '#27ae60' : 'var(--text-muted)',
        border: isLive ? '1px solid rgba(39,174,96,0.3)' : '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
      }}>
        {isLive ? <Zap size={10} /> : <PauseCircle size={10} />}
        {offer.status}
      </div>

      {/* Offer info */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{offer.title}</div>
        {offer.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{offer.description}</div>}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12 }}>
          <span>🏷️ {offer.discount_pct}% off</span>
          <span>₹{offer.final_price_inr} final</span>
          <span>⏱️ {offer.valid_minutes} min</span>
        </div>
      </div>

      {/* Redemption progress */}
      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          {offer.redemptions}/{offer.max_redemptions} redeemed
        </div>
        <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${redemptionPct}%`, background: 'var(--bitezy-red)', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit2 size={13} /> Edit</button>
        <button className="btn btn-ghost btn-sm" onClick={onToggle} style={{ color: isLive ? 'var(--text-muted)' : '#27ae60' }}>
          {isLive ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
          {isLive ? 'Pause' : 'Publish'}
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
