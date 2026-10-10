import { useState, useEffect } from 'react'
import { X, Store, Sliders, CheckCircle2, AlertCircle, LogOut, ShieldCheck } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

interface MerchantProfileDrawerProps {
  merchant: any
  token: string | null
  isOpen: boolean
  onClose: () => void
  onUpdateMerchant: (updatedMerchant: any) => void
  onSignOut: () => void
}

export default function MerchantProfileDrawer({
  merchant,
  token,
  isOpen,
  onClose,
  onUpdateMerchant,
  onSignOut
}: MerchantProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'params'>('info')
  const [form, setForm] = useState({
    name: '',
    owner_name: '',
    phone: '',
    category: 'cafe',
    locality: 'Koramangala',
    address: '',
    open_hour: 8,
    close_hour: 22,
    promo_start_hour: 13,
    promo_end_hour: 16,
    max_discount_pct: 20,
    min_margin_pct: 15
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (merchant) {
      setForm({
        name: merchant.name || '',
        owner_name: merchant.owner_name || '',
        phone: merchant.phone || '',
        category: merchant.category || 'cafe',
        locality: merchant.locality || 'Koramangala',
        address: merchant.address || '',
        open_hour: merchant.open_hour ?? 8,
        close_hour: merchant.close_hour ?? 22,
        promo_start_hour: merchant.promo_start_hour ?? 13,
        promo_end_hour: merchant.promo_end_hour ?? 16,
        max_discount_pct: merchant.max_discount_pct ?? 20,
        min_margin_pct: merchant.min_margin_pct ?? 15
      })
    }
  }, [merchant, isOpen])

  if (!isOpen || !merchant) return null

  const handleSaveProfile = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await axios.put(`${API_BASE}/merchant/profile/me`, form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onUpdateMerchant(res.data)
      localStorage.setItem('bitezy_merchant_data', JSON.stringify(res.data))
      setSuccess('Business profile & operating parameters updated!')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update merchant profile.')
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
              width: 44, height: 44, borderRadius: 12,
              background: '#2563eb', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Store size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>{merchant.name || 'Merchant Profile'}</h3>
                <span className="badge badge-blue" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <ShieldCheck size={11} /> Partner
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {merchant.owner_name ? `Owner: ${merchant.owner_name} • ` : ''}ID: <span style={{ color: '#2563eb', fontWeight: 600 }}>{merchant.id}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: 20, gap: 4 }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === 'info' ? '#2563eb' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'info' ? '#2563eb' : 'transparent'}`,
              marginBottom: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <Store size={16} /> Business Details
          </button>
          <button
            onClick={() => setActiveTab('params')}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === 'params' ? '#2563eb' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'params' ? '#2563eb' : 'transparent'}`,
              marginBottom: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <Sliders size={16} /> Operating Parameters
          </button>
        </div>

        {/* Tab 1: Business Details */}
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Restaurant / Cafe Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Owner Name</label>
                <input
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  <option value="cafe">Cafe</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="fast_food">Fast Food</option>
                  <option value="healthy">Healthy / Salad</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Street Address</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. 100 Feet Road, Indiranagar"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Operating Parameters */}
        {activeTab === 'params' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Opening Hour (24h)</label>
                <input
                  type="number"
                  value={form.open_hour}
                  onChange={e => setForm(f => ({ ...f, open_hour: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Closing Hour (24h)</label>
                <input
                  type="number"
                  value={form.close_hour}
                  onChange={e => setForm(f => ({ ...f, close_hour: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Promo Start Hour (24h)</label>
                <input
                  type="number"
                  value={form.promo_start_hour}
                  onChange={e => setForm(f => ({ ...f, promo_start_hour: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Promo End Hour (24h)</label>
                <input
                  type="number"
                  value={form.promo_end_hour}
                  onChange={e => setForm(f => ({ ...f, promo_end_hour: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Max Offer Discount (%)</label>
                <input
                  type="number"
                  value={form.max_discount_pct}
                  onChange={e => setForm(f => ({ ...f, max_discount_pct: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Min Profit Margin (%)</label>
                <input
                  type="number"
                  value={form.min_margin_pct}
                  onChange={e => setForm(f => ({ ...f, min_margin_pct: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--bitezy-red)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <CheckCircle2 size={14} /> {success}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSaveProfile}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 16, background: '#2563eb', borderColor: '#2563eb' }}
        >
          {loading ? 'Saving...' : 'Save Business Profile'}
        </button>

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
            <LogOut size={16} /> Sign Out Partner Account
          </button>
        </div>
      </div>
    </div>
  )
}
