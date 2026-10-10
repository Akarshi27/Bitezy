import { useState, useEffect } from 'react'
import { X, User, ShoppingBag, CheckCircle2, AlertCircle, LogOut, Clock } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

interface CustomerProfileDrawerProps {
  user: any
  token: string | null
  isOpen: boolean
  onClose: () => void
  onUpdateUser: (updatedUser: any) => void
  onSignOut: () => void
}

export default function CustomerProfileDrawer({
  user,
  token,
  isOpen,
  onClose,
  onUpdateUser,
  onSignOut
}: CustomerProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile')
  const [form, setForm] = useState({
    name: '',
    locality: 'Koramangala',
    language: 'en',
    budget: 300,
    food_type: 'both',
    declared_preferences: 'south_indian,cafe'
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        locality: user.locality || 'Koramangala',
        language: user.language || 'en',
        budget: user.budget || user.wallet_inr || 300,
        food_type: user.food_type || 'both',
        declared_preferences: user.declared_preferences || 'south_indian,cafe'
      })

      // Load orders for this customer from localStorage
      try {
        const saved = localStorage.getItem(`bitezy_orders_${user.id}`)
        if (saved) {
          setOrders(JSON.parse(saved))
        } else {
          setOrders([])
        }
      } catch {
        setOrders([])
      }
    }
  }, [user, isOpen])

  if (!isOpen || !user) return null

  const handleSaveProfile = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await axios.put(`${API_BASE}/customer/profile/me`, form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onUpdateUser(res.data)
      localStorage.setItem('bitezy_customer_data', JSON.stringify(res.data))
      setSuccess('Profile & preferences saved successfully!')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 2500 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-md slide-up" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--bitezy-red, #e23744)', color: 'white',
              fontSize: 18, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {user.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>{user.name || 'Customer Profile'}</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email || user.id} • Customer ID: <span style={{ color: 'var(--bitezy-red)', fontWeight: 600 }}>{user.id}</span></div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: 20, gap: 4 }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === 'profile' ? 'var(--bitezy-red)' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'profile' ? 'var(--bitezy-red)' : 'transparent'}`,
              marginBottom: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <User size={16} /> Profile & Preferences
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === 'orders' ? 'var(--bitezy-red)' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'orders' ? 'var(--bitezy-red)' : 'transparent'}`,
              marginBottom: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <ShoppingBag size={16} /> Order History ({orders.length})
          </button>
        </div>

        {/* Tab 1: Profile & Preferences */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Full Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Locality</label>
                <select
                  value={form.locality}
                  onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  {['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Marathahalli', 'BTM Layout', 'Jayanagar', 'Malleshwaram'].map(l => (
                    <option key={l} value={l}>{l}, Bengaluru</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Preferred Language</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  <option value="en">English</option>
                  <option value="hi-en">Hindi-English (Hinglish)</option>
                  <option value="kn-en">Kannada-English</option>
                  <option value="ta-en">Tamil-English</option>
                  <option value="te-en">Telugu-English</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Meal Budget (₹)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Dietary Choice</label>
                <select
                  value={form.food_type}
                  onChange={e => setForm(f => ({ ...f, food_type: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  <option value="both">Vegetarian & Non-Veg</option>
                  <option value="veg">Vegetarian Only</option>
                  <option value="non_veg">Non-Vegetarian Only</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Declared Preferences (comma-separated)
              </label>
              <input
                value={form.declared_preferences}
                onChange={e => setForm(f => ({ ...f, declared_preferences: e.target.value }))}
                placeholder="e.g. south_indian,cafe,fast_food"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--bitezy-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {success && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> {success}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            >
              {loading ? 'Saving...' : 'Save Profile & Preferences'}
            </button>
          </div>
        )}

        {/* Tab 2: Order History */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 250 }}>
            {orders.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: 'var(--bg-primary)', borderRadius: 12,
                border: '1px dashed var(--border-default)'
              }}>
                <ShoppingBag size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>No Past Orders Yet</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, margin: '0 auto 16px' }}>
                  Place a demo order from the Bitezy storefront to see your order summary, discounts, and items recorded here!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto' }}>
                {orders.map((ord: any, idx: number) => (
                  <div key={ord.id || idx} style={{
                    padding: 14, borderRadius: 12,
                    background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                    display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Order #{ord.id}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {new Date(ord.date).toLocaleString()}
                        </div>
                      </div>
                      <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    </div>

                    <div style={{ borderTop: '1px border-bottom', padding: '8px 0', borderTopStyle: 'dashed', borderBottomStyle: 'dashed', borderColor: 'var(--border-default)' }}>
                      {ord.items?.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
                          <span>{item.name || item.item_name} {item.discountPct ? <span style={{ fontSize: 11, color: 'var(--bitezy-red)', fontWeight: 700 }}>({item.discountPct}% OFF)</span> : ''}</span>
                          <span style={{ fontWeight: 600 }}>₹{item.price_inr || item.final_price || item.price}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Paid:</span>
                      <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--bitezy-red)' }}>₹{ord.total?.toFixed(0) || ord.subtotal?.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer: Sign Out */}
        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16, marginTop: 20 }}>
          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            onClick={() => {
              onSignOut()
              onClose()
            }}
          >
            <LogOut size={16} /> Sign Out Customer Account
          </button>
        </div>
      </div>
    </div>
  )
}
