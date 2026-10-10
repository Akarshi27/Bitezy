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
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null)
  const [authRole, setAuthRole] = useState<'customer' | 'merchant' | null>(() => {
    return (localStorage.getItem('bitezy_active_role') as any) || (localStorage.getItem('bitezy_customer_token') ? 'customer' : localStorage.getItem('bitezy_merchant_token') ? 'merchant' : null)
  })
  
  const [cart, setCart] = useState<any[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/data/customers`).catch(() => ({ data: [] }))
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCustomers(res.data)
        const savedCustData = localStorage.getItem('bitezy_customer_data')
        if (savedCustData) {
          try {
            setActiveCustomer(JSON.parse(savedCustData))
          } catch {
            const priya = res.data.find((c: any) => c.id === 'c_020') || res.data[0]
            setActiveCustomer(priya)
          }
        } else {
          const priya = res.data.find((c: any) => c.id === 'c_020') || res.data[0]
          setActiveCustomer(priya)
        }
      }
    } catch (err) {
      console.error('Error fetching customers in App:', err)
    }
  }

  const handleAuthSuccess = (user: any, role: 'customer' | 'merchant') => {
    setAuthRole(role)
    if (role === 'customer') {
      setActiveCustomer(user)
    }
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
          customers={customers}
          onSelectCustomer={(cust) => {
            setActiveCustomer(cust)
            localStorage.setItem('bitezy_customer_data', JSON.stringify(cust))
          }}
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
          <Route
            path="/merchant"
            element={<MerchantPortal />}
          />
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />
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
