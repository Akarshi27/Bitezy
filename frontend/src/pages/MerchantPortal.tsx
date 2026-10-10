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
  Flame
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

export default function MerchantPortal() {
  const [merchantsList, setMerchantsList] = useState<any[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('m_001')
  
  const [merchantProfile, setMerchantProfile] = useState<any | null>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any | null>(null)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'offers' | 'analytics'>('overview')
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

  // Merchant Auth state
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [loggedInMerchant, setLoggedInMerchant] = useState<any | null>(null)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', category: 'cafe', locality: 'Koramangala' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const handleMerchantLogin = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const res = await axios.post(`${API_BASE}/auth/merchant/login`, { email: authForm.email, password: authForm.password })
      setLoggedInMerchant(res.data)
      setSelectedMerchantId(res.data.id)
      setAuthModal(null)
    } catch (e: any) { setAuthError(e.response?.data?.detail || 'Login failed') }
    finally { setAuthLoading(false) }
  }

  const handleMerchantSignup = async () => {
    if (!authForm.name || !authForm.email || !authForm.password) { setAuthError('All fields required'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const res = await axios.post(`${API_BASE}/auth/merchant/register`, authForm)
      setLoggedInMerchant(res.data)
      setSelectedMerchantId(res.data.id)
      setAuthModal(null)
    } catch (e: any) { setAuthError(e.response?.data?.detail || 'Signup failed') }
    finally { setAuthLoading(false) }
  }

  useEffect(() => {
    fetchMerchantsList()
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
      const [profRes, menuRes, anaRes] = await Promise.all([
        axios.get(`${API_BASE}/merchant/me/${mId}`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/merchant/menu/${mId}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/merchant/analytics/${mId}`).catch(() => ({ data: null }))
      ])

      if (profRes.data) setMerchantProfile(profRes.data)
      if (Array.isArray(menuRes.data)) setMenuItems(menuRes.data)
      if (anaRes.data) setAnalytics(anaRes.data)

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
      setNewItemForm({
        title: '',
        category: 'general',
        price_inr: 150,
        unit_cost_inr: 60,
        stock_units: 15,
        prep_minutes: 10,
        is_veg: 1,
        tags: 'snack,vegetarian'
      })
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {loggedInMerchant ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bitezy-red-light)', border: '1px solid rgba(226,55,68,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}>
              <Flame size={14} style={{ color: 'var(--bitezy-red)' }} />
              <span style={{ color: 'var(--bitezy-red)', fontWeight: 700 }}>{loggedInMerchant.name}</span>
              <button onClick={() => setLoggedInMerchant(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 4 }}><X size={13} /></button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => { setAuthTab('login'); setAuthModal('login'); setAuthError('') }} style={{ gap: 5 }}>
              <LogIn size={13} /> Partner Sign In
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Demo Merchant:</span>
          <select
            value={selectedMerchantId}
            onChange={(e) => setSelectedMerchantId(e.target.value)}
            style={{ width: 'auto', minWidth: '220px' }}
          >
            {merchantsList.map(m => (
              <option key={m.id} value={m.id}>
                {m.id} - {m.name} ({m.category})
              </option>
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('overview')}
        >
          <Store size={16} /> Profile &amp; Operating Rules
        </button>
        <button
          className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('menu')}
        >
          <Utensils size={16} /> Live Menu Management ({menuItems.length})
        </button>
        <button
          className={`btn ${activeTab === 'offers' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('offers')}
        >
          <ListOrdered size={16} /> Customer Responses ({analytics?.offers_sent || 0})
        </button>
        <button
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('analytics')}
        >
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
                    <span className="metric-value font-mono">
                      {merchantProfile.open_hour}:00 - {merchantProfile.close_hour}:00
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Promo Window</span>
                    <span className="metric-value font-mono">
                      {merchantProfile.promo_start_hour ? `${merchantProfile.promo_start_hour}:00 - ${merchantProfile.promo_end_hour}:00` : 'All Day'}
                    </span>
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
                      <th>ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Dietary</th>
                      <th>Selling Price</th>
                      <th>Stock Units</th>
                      <th>Prep Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td className="font-mono text-accent">{item.id}</td>
                        <td className="font-semibold">{item.title}</td>
                        <td><span className="badge badge-blue">{item.category}</span></td>
                        <td>
                          <span className={`badge ${item.is_veg ? 'badge-green' : 'badge-red'}`}>
                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>
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

          {/* Tab 3: Customer Offer Responses Log */}
          {activeTab === 'offers' && (
            <div className="card fade-in" style={{ overflowX: 'auto' }}>
              <div className="section-title">
                <ListOrdered size={16} /> Real-Time Customer Response Log
              </div>

              {analytics?.responses?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Info size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p>No customer responses recorded yet. Test offers on the Storefront or Simulator!</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Offer ID</th>
                      <th>Customer ID</th>
                      <th>Merchant ID</th>
                      <th>Action Response</th>
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

          {/* Tab 4: Merchant Analytics */}
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

      {/* Add Item Modal */}
      {newItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="card-elevated fade-in" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add New Dish / Drink</h3>
              <button onClick={() => setNewItemModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label>Item Title</label>
                <input type="text" value={newItemForm.title} onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })} placeholder="e.g. Masala Dosa & Filter Coffee" />
              </div>

              <div className="grid-2">
                <div>
                  <label>Selling Price (₹)</label>
                  <input type="number" value={newItemForm.price_inr} onChange={(e) => setNewItemForm({ ...newItemForm, price_inr: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label>Unit Cost (₹)</label>
                  <input type="number" value={newItemForm.unit_cost_inr} onChange={(e) => setNewItemForm({ ...newItemForm, unit_cost_inr: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Stock Units</label>
                  <input type="number" value={newItemForm.stock_units} onChange={(e) => setNewItemForm({ ...newItemForm, stock_units: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label>Prep Time (min)</label>
                  <input type="number" value={newItemForm.prep_minutes} onChange={(e) => setNewItemForm({ ...newItemForm, prep_minutes: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div>
                <label>Dietary Type</label>
                <select value={newItemForm.is_veg} onChange={(e) => setNewItemForm({ ...newItemForm, is_veg: parseInt(e.target.value) })}>
                  <option value={1}>Vegetarian (VEG)</option>
                  <option value={0}>Non-Vegetarian (NON-VEG)</option>
                </select>
              </div>

              <div>
                <label>Tags (comma separated)</label>
                <input type="text" value={newItemForm.tags} onChange={(e) => setNewItemForm({ ...newItemForm, tags: e.target.value })} placeholder="e.g. south_indian,breakfast,popular" />
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAddItem}>
              Save to Menu Directory
            </button>
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
              <div>
                <label>Item Title</label>
                <input type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} />
              </div>

              <div className="grid-2">
                <div>
                  <label>Selling Price (₹)</label>
                  <input type="number" value={editingItem.price_inr} onChange={(e) => setEditingItem({ ...editingItem, price_inr: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label>Stock Units</label>
                  <input type="number" value={editingItem.stock_units} onChange={(e) => setEditingItem({ ...editingItem, stock_units: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Prep Time (min)</label>
                  <input type="number" value={editingItem.prep_minutes} onChange={(e) => setEditingItem({ ...editingItem, prep_minutes: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label>Dietary Type</label>
                  <select value={editingItem.is_veg} onChange={(e) => setEditingItem({ ...editingItem, is_veg: parseInt(e.target.value) })}>
                    <option value={1}>Vegetarian (VEG)</option>
                    <option value={0}>Non-Vegetarian (NON-VEG)</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleUpdateItem}>
              Update Item
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
