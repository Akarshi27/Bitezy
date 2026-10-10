import { useState } from 'react'
import {
  ShoppingBag, Shield, Store, Flame, Utensils, LogIn, UserCircle, MapPin, ChevronDown, X
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

interface NavbarProps {
  currentPath: string
  onNavigate: (path: string) => void
  activeCustomer: any
  customers: any[]
  onSelectCustomer: (cust: any) => void
  cartCount: number
  onOpenCart: () => void
  onAuthChange?: (cust: any) => void
}

export default function Navbar({
  currentPath, onNavigate, activeCustomer, customers,
  onSelectCustomer, cartCount, onOpenCart, onAuthChange
}: NavbarProps) {
  const [authModal, setAuthModal] = useState<'login' | 'signup' | 'profile' | null>(null)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [showPersonas, setShowPersonas] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', locality: 'Koramangala', language: 'en', marketing_consent: true })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<any>(null)

  const isRegistered = loggedInUser && loggedInUser.email

  const handleLogin = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await axios.post(`${API_BASE}/auth/customer/login`, { email: form.email, password: form.password })
      setLoggedInUser(res.data)
      onSelectCustomer(res.data)
      onAuthChange?.(res.data)
      setAuthModal(null)
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || 'Login failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { setAuthError('All fields required'); return }
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await axios.post(`${API_BASE}/auth/customer/register`, form)
      setLoggedInUser(res.data)
      onSelectCustomer(res.data)
      onAuthChange?.(res.data)
      setAuthModal(null)
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || 'Signup failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setLoggedInUser(null)
    const fallback = customers[0]
    if (fallback) onSelectCustomer(fallback)
    setAuthModal(null)
  }

  const currentUser = loggedInUser || activeCustomer

  return (
    <>
      <header className="bitezy-nav" style={{ padding: '0 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, gap: 20 }}>

          {/* Bitezy Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }} onClick={() => onNavigate('/')}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--bitezy-red)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-red)'
            }}>
              <Flame size={20} color="white" />
            </div>
            <div>
              <div className="bitezy-wordmark">Bitezy</div>
              <div className="bitezy-tagline">Your cravings. Smarter deals.</div>
            </div>
          </div>

          {/* Nav Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', padding: 4, borderRadius: 10, border: '1px solid var(--border-default)' }}>
            <button
              className={`btn ${currentPath === '/' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => onNavigate('/')}
            >
              <Store size={14} /> Storefront
            </button>
            <button
              className={`btn ${currentPath === '/merchant' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => onNavigate('/merchant')}
            >
              <Utensils size={14} /> Partner Hub
            </button>
            <button
              className={`btn ${currentPath === '/admin' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => onNavigate('/admin')}
            >
              <Shield size={14} /> AI Center
            </button>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Location + Persona Selector */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                style={{ gap: 6, fontSize: 13 }}
                onClick={() => setShowPersonas(v => !v)}
              >
                <MapPin size={14} style={{ color: 'var(--bitezy-red)' }} />
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.locality || 'Select area'}
                </span>
                <ChevronDown size={12} />
              </button>

              {showPersonas && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
                  borderRadius: 12, padding: 12, minWidth: 300,
                  boxShadow: 'var(--shadow-elevated)', zIndex: 2000
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    🎭 Demo Personas
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {customers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { onSelectCustomer(c); setShowPersonas(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8, border: 'none',
                          background: activeCustomer?.id === c.id ? 'var(--bitezy-red-light)' : 'transparent',
                          color: activeCustomer?.id === c.id ? 'var(--bitezy-red)' : 'var(--text-secondary)',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          fontSize: 13, fontWeight: activeCustomer?.id === c.id ? 700 : 400
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'var(--bitezy-red)', flexShrink: 0
                        }}>
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.locality || 'Bengaluru'} • {c.id}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Button */}
            {isRegistered ? (
              <button className="btn btn-ghost" style={{ gap: 6, fontSize: 13 }} onClick={() => setAuthModal('profile')}>
                <UserCircle size={16} style={{ color: 'var(--bitezy-red)' }} />
                {loggedInUser.name?.split(' ')[0]}
              </button>
            ) : (
              <button className="btn btn-secondary" style={{ gap: 6, fontSize: 13 }} onClick={() => { setAuthTab('login'); setAuthModal('login'); setAuthError('') }}>
                <LogIn size={14} /> Sign In
              </button>
            )}

            {/* Cart */}
            <button className="btn btn-primary btn-sm" style={{ position: 'relative', padding: '7px 14px' }} onClick={onOpenCart}>
              <ShoppingBag size={15} />
              Cart
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: 'white', color: 'var(--bitezy-red)',
                  fontSize: 10, fontWeight: 900,
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bitezy-red)'
                }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {authModal === 'login' || authModal === 'signup' ? (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAuthModal(null)}>
          <div className="modal-box modal-sm slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="bitezy-wordmark" style={{ fontSize: 20 }}>Bitezy</div>
              <button onClick={() => setAuthModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: 20, gap: 4 }}>
              {(['login', 'signup'] as const).map(tab => (
                <button key={tab} onClick={() => setAuthTab(tab)} style={{
                  flex: 1, padding: '8px 0', fontSize: 14, fontWeight: 700,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: authTab === tab ? 'var(--bitezy-red)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${authTab === tab ? 'var(--bitezy-red)' : 'transparent'}`,
                  marginBottom: -1
                }}>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {authTab === 'signup' && (
                <>
                  <div>
                    <label>Full Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Priya Sharma" />
                  </div>
                  <div>
                    <label>Locality</label>
                    <select value={form.locality} onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}>
                      {['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Marathahalli', 'BTM Layout', 'Jayanagar', 'Malleshwaram'].map(l => (
                        <option key={l} value={l}>{l}, Bengaluru</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Language</label>
                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                      <option value="en">English</option>
                      <option value="hi-en">Hindi-English (Hinglish)</option>
                      <option value="kn-en">Kannada-English</option>
                      <option value="ta-en">Tamil-English</option>
                      <option value="te-en">Telugu-English</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.marketing_consent} onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))} style={{ width: 'auto' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>I agree to receive personalized food offers</span>
                  </label>
                </>
              )}
              <div>
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
              </div>
              <div>
                <label>Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
              </div>

              {authError && <div style={{ background: 'var(--bitezy-red-light)', border: '1px solid rgba(226,55,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--bitezy-red)' }}>{authError}</div>}

              <button
                className="btn btn-primary btn-lg"
                onClick={authTab === 'login' ? handleLogin : handleSignup}
                disabled={authLoading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                {authLoading ? '...' : authTab === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                {authTab === 'login' ? "Don't have an account? " : "Already have an account? "}
                <span style={{ color: 'var(--bitezy-red)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setAuthTab(authTab === 'login' ? 'signup' : 'login')}>
                  {authTab === 'login' ? 'Sign up' : 'Sign in'}
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : authModal === 'profile' && loggedInUser ? (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAuthModal(null)}>
          <div className="modal-box modal-sm slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800 }}>My Profile</h3>
              <button onClick={() => setAuthModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-default)', marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bitezy-red)', color: 'white', fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loggedInUser.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{loggedInUser.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{loggedInUser.email}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{loggedInUser.locality} • {loggedInUser.id}</div>
              </div>
            </div>
            <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      ) : null}

      {/* Click away to close persona dropdown */}
      {showPersonas && <div style={{ position: 'fixed', inset: 0, zIndex: 1999 }} onClick={() => setShowPersonas(false)} />}
    </>
  )
}
