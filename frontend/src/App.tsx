import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'

import Navbar from './components/Navbar'
import CustomerStore from './pages/CustomerStore'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

const API_BASE = 'http://localhost:8000'

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [customers, setCustomers] = useState<any[]>([])
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null)
  
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
        // Default active customer: Priya (c_020) or first customer
        const priya = res.data.find((c: any) => c.id === 'c_020') || res.data[0]
        setActiveCustomer(priya)
      }
    } catch (err) {
      console.error('Error fetching customers in App:', err)
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Dual Interface Navbar Header */}
      <Navbar
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
        activeCustomer={activeCustomer}
        customers={customers}
        onSelectCustomer={(cust) => setActiveCustomer(cust)}
        cartCount={cart.length}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Routes */}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
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
