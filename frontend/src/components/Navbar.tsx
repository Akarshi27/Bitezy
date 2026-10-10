import { ShoppingBag, Shield, Store, Sparkles, UserCheck } from 'lucide-react'

interface NavbarProps {
  currentPath: string
  onNavigate: (path: string) => void
  activeCustomer: any
  customers: any[]
  onSelectCustomer: (cust: any) => void
  cartCount: number
  onOpenCart: () => void
}

export default function Navbar({
  currentPath,
  onNavigate,
  activeCustomer,
  customers,
  onSelectCustomer,
  cartCount,
  onOpenCart
}: NavbarProps) {
  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-default)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => onNavigate('/')}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            OfferIQ
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1' }}>
            Hyperlocal Commerce Platform
          </div>
        </div>
      </div>

      {/* Dual Interface Switcher Tabs */}
      <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
        <button
          className={`btn ${currentPath === '/' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
          onClick={() => onNavigate('/')}
        >
          <Store size={15} /> Customer Storefront
        </button>

        <button
          className={`btn ${currentPath === '/admin' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
          onClick={() => onNavigate('/admin')}
        >
          <Shield size={15} /> Intelligence Center (/admin)
        </button>
      </div>

      {/* Customer Persona Selector & Shopping Cart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Customer Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-default)', fontSize: '12px' }}>
          <UserCheck size={15} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Persona:</span>
          <select
            value={activeCustomer?.id || ''}
            onChange={(e) => {
              const selected = customers.find(c => c.id === e.target.value)
              if (selected) onSelectCustomer(selected)
            }}
            style={{ padding: '2px 6px', fontSize: '12px', background: 'transparent', border: 'none', fontWeight: 600 }}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.name} ({c.locality || 'Bengaluru'})
              </option>
            ))}
          </select>
        </div>

        {/* Shopping Cart Button */}
        <button
          className="btn btn-ghost"
          style={{ position: 'relative', padding: '8px 14px' }}
          onClick={onOpenCart}
        >
          <ShoppingBag size={18} />
          <span>Cart</span>
          {cartCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--accent-blue)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
