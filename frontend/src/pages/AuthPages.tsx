import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Flame, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertCircle, ShoppingBag, Utensils } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

interface AuthPageProps {
  role: 'customer' | 'merchant'
  mode: 'login' | 'signup'
  onAuthSuccess?: (user: any, role: 'customer' | 'merchant', token: string) => void
}

export default function AuthPages({ role, mode, onAuthSuccess }: AuthPageProps) {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form states
  const [form, setForm] = useState({
    // Shared
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    locality: 'Koramangala',
    
    // Customer specific
    language: 'en',
    marketing_consent: true,
    food_type: 'both',
    declared_preferences: 'south_indian,cafe',

    // Merchant specific
    owner_name: '',
    phone: '',
    category: 'cafe',
    address: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup') {
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters long.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (role === 'customer' && !form.name) {
        setError('Full Name is required.')
        return
      }
      if (role === 'merchant' && (!form.name || !form.owner_name)) {
        setError('Business Name and Owner Name are required.')
        return
      }
    }

    setLoading(true)

    try {
      if (role === 'customer') {
        const endpoint = mode === 'signup' ? `${API_BASE}/auth/customer/register` : `${API_BASE}/auth/customer/login`
        const payload = mode === 'signup' ? {
          email: form.email,
          password: form.password,
          name: form.name,
          locality: form.locality,
          language: form.language,
          marketing_consent: form.marketing_consent,
          food_type: form.food_type,
          declared_preferences: form.declared_preferences
        } : {
          email: form.email,
          password: form.password
        }

        const res = await axios.post(endpoint, payload)
        const userObj = res.data.customer || res.data
        const token = res.data.token || 'demo_token'

        localStorage.setItem('bitezy_customer_token', token)
        localStorage.setItem('bitezy_customer_data', JSON.stringify(userObj))
        localStorage.setItem('bitezy_active_role', 'customer')

        if (onAuthSuccess) onAuthSuccess(userObj, 'customer', token)
        setSuccessMsg(mode === 'signup' ? 'Account created successfully!' : 'Signed in successfully!')
        setTimeout(() => navigate('/customer'), 500)

      } else {
        const endpoint = mode === 'signup' ? `${API_BASE}/auth/merchant/register` : `${API_BASE}/auth/merchant/login`
        const payload = mode === 'signup' ? {
          email: form.email,
          password: form.password,
          name: form.name,
          owner_name: form.owner_name,
          phone: form.phone,
          category: form.category,
          locality: form.locality,
          address: form.address
        } : {
          email: form.email,
          password: form.password
        }

        const res = await axios.post(endpoint, payload)
        const merchObj = res.data.merchant || res.data
        const token = res.data.token || 'demo_token'

        localStorage.setItem('bitezy_merchant_token', token)
        localStorage.setItem('bitezy_merchant_data', JSON.stringify(merchObj))
        localStorage.setItem('bitezy_active_role', 'merchant')

        if (onAuthSuccess) onAuthSuccess(merchObj, 'merchant', token)
        setSuccessMsg(mode === 'signup' ? 'Partner business registered!' : 'Signed in to Partner Hub!')
        setTimeout(() => navigate('/merchant'), 500)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || `${mode === 'signup' ? 'Registration' : 'Login'} failed. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const isCustomer = role === 'customer'
  const isLogin = mode === 'login'

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--bitezy-red, #e23744)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(226, 55, 68, 0.3)'
        }}>
          <Flame size={20} color="white" />
        </div>
        <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--bitezy-red, #e23744)', letterSpacing: '-0.02em' }}>Bitezy</span>
      </div>

      {/* Auth Container */}
      <div className="card-elevated fade-in" style={{
        maxWidth: 480, width: '100%', background: '#ffffff',
        border: '1px solid #e5e7eb', borderRadius: 20, padding: '32px 28px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
      }}>
        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Back to Role Selection
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: isCustomer ? 'rgba(226, 55, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: isCustomer ? 'var(--bitezy-red, #e23744)' : '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {isCustomer ? <ShoppingBag size={22} /> : <Utensils size={22} />}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
              {isCustomer ? (isLogin ? 'Customer Sign In' : 'Create Customer Account') : (isLogin ? 'Partner Sign In' : 'Register Your Business')}
            </h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, marginTop: 2 }}>
              {isCustomer ? 'Your cravings. Smarter deals.' : 'Bitezy Merchant Intelligence Hub'}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#16a34a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Customer Signup Extra Fields */}
          {!isLogin && isCustomer && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Priya Sharma"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Locality</label>
                  <select
                    value={form.locality}
                    onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  >
                    {['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Marathahalli', 'BTM Layout', 'Jayanagar', 'Malleshwaram'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Dietary Choice</label>
                  <select
                    value={form.food_type}
                    onChange={e => setForm(f => ({ ...f, food_type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  >
                    <option value="both">Both Veg & Non-Veg</option>
                    <option value="veg">Vegetarian Only</option>
                    <option value="non_veg">Non-Vegetarian Only</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Merchant Signup Extra Fields */}
          {!isLogin && !isCustomer && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Cafe / Restaurant Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Little Fern Café"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={form.owner_name}
                    onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                    placeholder="Owner Full Name"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  >
                    <option value="cafe">Cafe</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="fast_food">Fast Food</option>
                    <option value="healthy">Healthy / Salad</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Locality</label>
                  <select
                    value={form.locality}
                    onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  >
                    {['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Marathahalli', 'BTM Layout'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Email Address *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Confirm Password *</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
            </div>
          )}

          {/* Marketing consent checkbox for customer signup */}
          {!isLogin && isCustomer && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
              <input
                type="checkbox"
                checked={form.marketing_consent}
                onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))}
              />
              <span style={{ fontSize: 13, color: '#4b5563' }}>
                I explicitly consent to receive promotional food offers based on my preferences.
              </span>
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%', justifyContent: 'center', marginTop: 8,
              background: isCustomer ? 'var(--bitezy-red, #e23744)' : '#2563eb',
              borderColor: isCustomer ? 'var(--bitezy-red, #e23744)' : '#2563eb'
            }}
          >
            {loading ? <Loader2 size={16} className="spinner" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Switch Link */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
          {isLogin ? "Don't have an account? " : 'Already registered? '}
          <span
            style={{ color: isCustomer ? 'var(--bitezy-red, #e23744)' : '#2563eb', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => navigate(isLogin ? (isCustomer ? '/signup/customer' : '/signup/merchant') : (isCustomer ? '/login/customer' : '/login/merchant'))}
          >
            {isLogin ? (isCustomer ? 'Sign up as Customer' : 'Register your Cafe') : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  )
}
