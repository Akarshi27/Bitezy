import { useState } from 'react'
import {
  ShoppingBag, Shield, Store, Flame, Utensils, LogIn, MapPin, ChevronDown
} from 'lucide-react'
import CustomerProfileDrawer from './CustomerProfileDrawer'
import MerchantProfileDrawer from './MerchantProfileDrawer'

interface NavbarProps {
  currentPath: string
  onNavigate: (path: string) => void
  activeCustomer: any
  customers: any[]
  onSelectCustomer: (cust: any) => void
  cartCount: number
  onOpenCart: () => void
  authRole?: 'customer' | 'merchant' | null
  activeMerchant?: any
  customerToken?: string | null
  merchantToken?: string | null
  onSignOutCustomer?: () => void
  onSignOutMerchant?: () => void
  onUpdateCustomer?: (cust: any) => void
  onUpdateMerchant?: (merch: any) => void
}

export default function Navbar({
  currentPath,
  onNavigate,
  activeCustomer,
  customers,
  onSelectCustomer,
  cartCount,
  onOpenCart,
  authRole = null,
  activeMerchant = null,
  customerToken = null,
  merchantToken = null,
  onSignOutCustomer,
  onSignOutMerchant,
  onUpdateCustomer,
  onUpdateMerchant
}: NavbarProps) {
  const [showPersonas, setShowPersonas] = useState(false)
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false)
  const [merchantDrawerOpen, setMerchantDrawerOpen] = useState(false)

  const isCustomerLoggedIn = authRole === 'customer' && !!activeCustomer
  const isMerchantLoggedIn = authRole === 'merchant' && !!activeMerchant

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
              className={`btn ${currentPath === '/customer' || currentPath === '/' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => onNavigate('/customer')}
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
                <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeCustomer?.locality || activeMerchant?.locality || 'Select area'}
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
                    🎭 Demo Customer Personas
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

            {/* Auth Profile / Sign In Button */}
            {isCustomerLoggedIn ? (
              <button
                className="btn btn-ghost"
                style={{ gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--bitezy-red)' }}
                onClick={() => setCustomerDrawerOpen(true)}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--bitezy-red)', color: 'white',
                  fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {activeCustomer?.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <span>{activeCustomer?.name?.split(' ')[0] || 'Customer'}</span>
              </button>
            ) : isMerchantLoggedIn ? (
              <button
                className="btn btn-ghost"
                style={{ gap: 6, fontSize: 13, fontWeight: 700, color: '#2563eb' }}
                onClick={() => setMerchantDrawerOpen(true)}
              >
                <Utensils size={15} color="#2563eb" />
                <span>{activeMerchant?.name?.split(' ')[0] || 'Partner'}</span>
                <span className="badge badge-blue" style={{ fontSize: 9, padding: '2px 5px' }}>Partner</span>
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ gap: 6, fontSize: 13 }}
                onClick={() => onNavigate('/')}
              >
                <LogIn size={14} /> Sign In
              </button>
            )}

            {/* Cart Button */}
            {currentPath !== '/merchant' && currentPath !== '/admin' && (
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
            )}
          </div>
        </div>
      </header>

      {/* Customer Profile Drawer */}
      <CustomerProfileDrawer
        user={activeCustomer}
        token={customerToken}
        isOpen={customerDrawerOpen}
        onClose={() => setCustomerDrawerOpen(false)}
        onUpdateUser={(updated) => {
          onSelectCustomer(updated)
          onUpdateCustomer?.(updated)
        }}
        onSignOut={() => {
          setCustomerDrawerOpen(false)
          onSignOutCustomer?.()
        }}
      />

      {/* Merchant Profile Drawer */}
      <MerchantProfileDrawer
        merchant={activeMerchant}
        token={merchantToken}
        isOpen={merchantDrawerOpen}
        onClose={() => setMerchantDrawerOpen(false)}
        onUpdateMerchant={(updated) => {
          onUpdateMerchant?.(updated)
        }}
        onSignOut={() => {
          setMerchantDrawerOpen(false)
          onSignOutMerchant?.()
        }}
      />

      {/* Click away to close persona dropdown */}
      {showPersonas && <div style={{ position: 'fixed', inset: 0, zIndex: 1999 }} onClick={() => setShowPersonas(false)} />}
    </>
  )
}
