import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import axios from 'axios'

import Navbar from './components/Navbar'
import LandingRoleSelection from './pages/LandingRoleSelection'
import AuthPages from './pages/AuthPages'
import CustomerStore from './pages/CustomerStore'
import MerchantPortal from './pages/MerchantPortal'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

const API_BASE = 'http://localhost:8000'

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [customers, setCustomers] = useState<any[]>([])
  
  // Auth state
  const [customerToken, setCustomerToken] = useState<string | null>(() => localStorage.getItem('bitezy_customer_token'))
  const [merchantToken, setMerchantToken] = useState<string | null>(() => localStorage.getItem('bitezy_merchant_token'))
  
  const [activeCustomer, setActiveCustomer] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('bitezy_customer_data')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [activeMerchant, setActiveMerchant] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('bitezy_merchant_data')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [authRole, setAuthRole] = useState<'customer' | 'merchant' | null>(() => {
    const role = localStorage.getItem('bitezy_active_role') as any
    if (role === 'customer' || role === 'merchant') return role
    if (localStorage.getItem('bitezy_customer_token')) return 'customer'
    if (localStorage.getItem('bitezy_merchant_token')) return 'merchant'
    return null
  })

  const [cart, setCart] = useState<any[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    fetchCustomers()
    verifyAndFetchProfiles()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/data/customers`).catch(() => ({ data: [] }))
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCustomers(res.data)
        if (!activeCustomer) {
          const priya = res.data.find((c: any) => c.id === 'c_020') || res.data[0]
          setActiveCustomer(priya)
        }
      }
    } catch (err) {
      console.error('Error fetching customers in App:', err)
    }
  }

  const verifyAndFetchProfiles = async () => {
    // Refresh customer profile if token exists
    const cToken = localStorage.getItem('bitezy_customer_token')
    if (cToken) {
      try {
        const res = await axios.get(`${API_BASE}/customer/profile/me`, {
          headers: { Authorization: `Bearer ${cToken}` }
        })
        if (res.data) {
          setActiveCustomer(res.data)
          localStorage.setItem('bitezy_customer_data', JSON.stringify(res.data))
        }
      } catch (err) {
        // Token invalid/expired
        localStorage.removeItem('bitezy_customer_token')
        localStorage.removeItem('bitezy_customer_data')
        setCustomerToken(null)
        if (authRole === 'customer') {
          setAuthRole(null)
          localStorage.removeItem('bitezy_active_role')
        }
      }
    }

    // Refresh merchant profile if token exists
    const mToken = localStorage.getItem('bitezy_merchant_token')
    if (mToken) {
      try {
        const res = await axios.get(`${API_BASE}/merchant/profile/me`, {
          headers: { Authorization: `Bearer ${mToken}` }
        })
        if (res.data) {
          setActiveMerchant(res.data)
          localStorage.setItem('bitezy_merchant_data', JSON.stringify(res.data))
        }
      } catch (err) {
        // Token invalid/expired
        localStorage.removeItem('bitezy_merchant_token')
        localStorage.removeItem('bitezy_merchant_data')
        setMerchantToken(null)
        if (authRole === 'merchant') {
          setAuthRole(null)
          localStorage.removeItem('bitezy_active_role')
        }
      }
    }
  }

  const handleAuthSuccess = (user: any, role: 'customer' | 'merchant', token: string) => {
    setAuthRole(role)
    localStorage.setItem('bitezy_active_role', role)

    if (role === 'customer') {
      setCustomerToken(token)
      setActiveCustomer(user)
      localStorage.setItem('bitezy_customer_token', token)
      localStorage.setItem('bitezy_customer_data', JSON.stringify(user))
    } else {
      setMerchantToken(token)
      setActiveMerchant(user)
      localStorage.setItem('bitezy_merchant_token', token)
      localStorage.setItem('bitezy_merchant_data', JSON.stringify(user))
    }
  }

  const handleSignOutCustomer = () => {
    if (customerToken) {
      axios.post(`${API_BASE}/auth/customer/logout`, {}, {
        headers: { Authorization: `Bearer ${customerToken}` }
      }).catch(() => {})
    }
    localStorage.removeItem('bitezy_customer_token')
    localStorage.removeItem('bitezy_customer_data')
    setCustomerToken(null)

    if (authRole === 'customer') {
      setAuthRole(null)
      localStorage.removeItem('bitezy_active_role')
    }

    const fallback = customers.find(c => c.id === 'c_020') || customers[0]
    if (fallback) setActiveCustomer(fallback)
    navigate('/')
  }

  const handleSignOutMerchant = () => {
    if (merchantToken) {
      axios.post(`${API_BASE}/auth/merchant/logout`, {}, {
        headers: { Authorization: `Bearer ${merchantToken}` }
      }).catch(() => {})
    }
    localStorage.removeItem('bitezy_merchant_token')
    localStorage.removeItem('bitezy_merchant_data')
    setMerchantToken(null)
    setActiveMerchant(null)

    if (authRole === 'merchant') {
      setAuthRole(null)
      localStorage.removeItem('bitezy_active_role')
    }
    navigate('/')
  }

  const handleAddToCart = (item: any, discountPct?: number) => {
    setCart(prev => [...prev, { ...item, discountPct }])
    setIsCartOpen(true)
  }

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const handleClearCart = () => {
    setCart([])
  }

  const isAuthRoute = ['/', '/login/customer', '/signup/customer', '/login/merchant', '/signup/merchant'].includes(location.pathname)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Navbar Header (shown on store, merchant, admin pages) */}
      {!isAuthRoute && (
        <Navbar
          currentPath={location.pathname}
          onNavigate={(path) => navigate(path)}
          activeCustomer={activeCustomer}
          activeMerchant={activeMerchant}
          authRole={authRole}
          customerToken={customerToken}
          merchantToken={merchantToken}
          customers={customers}
          onSelectCustomer={(cust) => {
            setActiveCustomer(cust)
            localStorage.setItem('bitezy_customer_data', JSON.stringify(cust))
          }}
          onSignOutCustomer={handleSignOutCustomer}
          onSignOutMerchant={handleSignOutMerchant}
          onUpdateCustomer={(updated) => setActiveCustomer(updated)}
          onUpdateMerchant={(updated) => setActiveMerchant(updated)}
          cartCount={cart.length}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {/* Routes */}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              authRole === 'customer' ? <Navigate to="/customer" replace /> :
              authRole === 'merchant' ? <Navigate to="/merchant" replace /> :
              <LandingRoleSelection />
            }
          />
          <Route
            path="/login/customer"
            element={<AuthPages role="customer" mode="login" onAuthSuccess={handleAuthSuccess} />}
          />
          <Route
            path="/signup/customer"
            element={<AuthPages role="customer" mode="signup" onAuthSuccess={handleAuthSuccess} />}
          />
          <Route
            path="/login/merchant"
            element={<AuthPages role="merchant" mode="login" onAuthSuccess={handleAuthSuccess} />}
          />
          <Route
            path="/signup/merchant"
            element={<AuthPages role="merchant" mode="signup" onAuthSuccess={handleAuthSuccess} />}
          />

          {/* Customer Storefront */}
          <Route
            path="/customer"
            element={
              <CustomerStore
                activeCustomer={activeCustomer}
                cart={cart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onClearCart={handleClearCart}
                isCartOpen={isCartOpen}
                onCloseCart={() => setIsCartOpen(false)}
              />
            }
          />

          {/* Merchant Portal Route Protection */}
          <Route
            path="/merchant"
            element={
              authRole === 'customer' ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
                  <div className="card-elevated" style={{ padding: 32, background: 'var(--bg-elevated)', borderRadius: 16 }}>
                    <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: 'var(--bitezy-red)' }}>
                      Customer Account Active
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                      You are currently signed in as customer <strong>{activeCustomer?.name}</strong>. Partner Hub requires a Merchant partner account.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button className="btn btn-primary" onClick={() => navigate('/login/merchant')}>
                        Sign In as Merchant Partner
                      </button>
                      <button className="btn btn-secondary" onClick={() => navigate('/customer')}>
                        Return to Storefront
                      </button>
                    </div>
                  </div>
                </div>
              ) : !merchantToken && authRole !== 'merchant' ? (
                <Navigate to="/login/merchant" replace />
              ) : (
                <MerchantPortal />
              )
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  )
}
