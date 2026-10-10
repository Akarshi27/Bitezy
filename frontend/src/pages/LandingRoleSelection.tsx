import { useNavigate } from 'react-router-dom'
import { Flame, Utensils, ShoppingBag, Shield, ArrowRight, Sparkles } from 'lucide-react'

export default function LandingRoleSelection() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header Bar */}
      <header style={{ borderBottom: '1px solid #f3f4f6', padding: '16px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--bitezy-red, #e23744)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(226, 55, 68, 0.3)'
            }}>
              <Flame size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--bitezy-red, #e23744)', letterSpacing: '-0.02em', lineHeight: 1 }}>Bitezy</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Your cravings. Smarter deals.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ gap: 6 }}>
              <Shield size={14} /> AI Intelligence Center
            </button>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 80px' }}>
        
        {/* Hero Title */}
        <div style={{ textAlign: 'center', maxWidth: 720, marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--bitezy-red-light, rgba(226, 55, 68, 0.08))', color: 'var(--bitezy-red, #e23744)',
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 16
          }}>
            <Sparkles size={14} /> Hyperlocal AI-Powered Offer Engine
          </div>

          <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#111827', marginBottom: 16 }}>
            Welcome to <span style={{ color: 'var(--bitezy-red, #e23744)' }}>Bitezy</span>
          </h1>
          <p style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.5 }}>
            Discover personalized food deals tailored to your preferences, or power your cafe's promotions with real-time AI guardrails.
          </p>
        </div>

        {/* Role Cards Container */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28, maxWidth: 900, width: '100%'
        }}>

          {/* Card A: Customer */}
          <div className="card-elevated" style={{
            background: '#ffffff', border: '2px solid #f3f4f6', borderRadius: 20,
            padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
          }}>
            <div>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(226, 55, 68, 0.1)', color: 'var(--bitezy-red, #e23744)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <ShoppingBag size={30} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bitezy-red, #e23744)', marginBottom: 6 }}>
                For Diners & Foodies
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 10 }}>
                Discover Food & Offers
              </h2>

              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
                Explore cafes near you in Koramangala & Bengaluru, receive personalized discount offers matching your budget, and place demo orders.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 15 }}
                onClick={() => navigate('/login/customer')}
              >
                Login as Customer <ArrowRight size={16} />
              </button>
              
              <button
                className="btn btn-secondary btn-lg"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}
                onClick={() => navigate('/signup/customer')}
              >
                Create Customer Account
              </button>
            </div>
          </div>

          {/* Card B: Merchant */}
          <div className="card-elevated" style={{
            background: '#ffffff', border: '2px solid #f3f4f6', borderRadius: 20,
            padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
          }}>
            <div>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <Utensils size={30} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb', marginBottom: 6 }}>
                For Cafe Owners & Partners
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 10 }}>
                Manage Cafe & Offers
              </h2>

              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
                Manage your live menu, monitor real-time occupancy, set margin guardrails, and publish promotional offers to nearby diners.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 15, background: '#2563eb', borderColor: '#2563eb' }}
                onClick={() => navigate('/login/merchant')}
              >
                Login as Merchant <ArrowRight size={16} />
              </button>

              <button
                className="btn btn-secondary btn-lg"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}
                onClick={() => navigate('/signup/merchant')}
              >
                Register Your Business
              </button>
            </div>
          </div>

        </div>

        {/* Demo Mode Notice */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            Looking for quick hackathon testing? You can also explore as a{' '}
            <span
              style={{ color: 'var(--bitezy-red, #e23744)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
              onClick={() => navigate('/customer')}
            >
              Demo Guest Customer
            </span>{' '}
            or view the{' '}
            <span
              style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
              onClick={() => navigate('/merchant')}
            >
              Demo Partner Portal
            </span>.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f3f4f6', padding: '20px 24px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
        Bitezy Hyperlocal Decisioned Offer Engine • Powered by FastAPI & Hugging Face AI
      </footer>
    </div>
  )
}
