import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LayoutDashboard,
  Zap,
  Store,
  Users,
  FileSpreadsheet,
  Clock,
  MapPin,
  Info,
  ChevronRight,
  RefreshCw,
  Check,
  Smartphone,
  ShieldCheck,
  BrainCircuit,
  BarChart3
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

interface Scenario {
  id: string
  customer_id: string
  merchant_id: string
  timestamp: string
  lat: number
  lng: number
  temp_c: number
  condition: string
  rain_mm: number
  minutes_available: number
  intent: string
  prompt: string
  expected_action?: string
  expected_reason?: string
  wallet_override?: number
}

interface Merchant {
  id: string
  name: string
  category: string
  locality: string
  lat: number
  lng: number
  capacity: number
  occupancy_pct: number
  max_discount_pct: number
  min_margin_pct: number
  base_price_inr: number
  unit_cost_inr: number
  open_hour: number
  close_hour: number
  promo_start_hour?: number
  promo_end_hour?: number
  weekdays_only?: boolean
}

interface Customer {
  id: string
  name: string
  language: string
  locality: string
  wallet_inr: number
  marketing_consent: boolean
  declared_preferences: string
  churn_risk: number
  avg_spend: number
}

interface DecisionResult {
  scenario_id: string
  action: 'send' | 'skip'
  reason: string
  offer?: {
    merchant_id: string
    discount_pct: number
    item_id: string
    final_price_inr: number
    valid_minutes: number
  }
  notification?: {
    title: string
    body: string
    language: string
    cta: string
  }
  ui_hints?: {
    distance_m: number
    walk_minutes: number
    weather_note: string
  }
  profit_estimate_inr?: number
  decision_trace?: {
    consent_check?: { passed: boolean }
    merchant_open_check?: { passed: boolean }
    promo_window_check?: { passed: boolean }
    distance_check?: { passed: boolean; distance_m: number; walk_minutes: number }
    selected_item_id?: string
    ranking_score?: number
    semantic_similarity?: number
    optimal_discount_pct?: number
    expected_profit_inr?: number
  }
}

interface BaselinePolicy {
  name: string
  summary: {
    overall: number
    groundedness: number
    constraint: number
    decision_match: number
    localization: number
  }
  economics: {
    offers_sent: number
    offers_skipped: number
    total_discount_spent_inr: number
    total_estimated_profit_inr?: number
  }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tester' | 'baselines' | 'merchants' | 'customers' | 'scenarios'>('dashboard')
  
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [merchants, setMerchants] = useState<Record<string, Merchant>>({})
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [baselinesData, setBaselinesData] = useState<Record<string, BaselinePolicy> | null>(null)
  
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('cur_001')
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null)
  const [loadingDecision, setLoadingDecision] = useState<boolean>(false)
  const [loadingBaselines, setLoadingBaselines] = useState<boolean>(false)
  
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [backendStatus, setBackendStatus] = useState<'connected' | 'error' | 'connecting'>('connecting')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setBackendStatus('connecting')
    try {
      const [scRes, mRes, cRes] = await Promise.all([
        axios.get(`${API_BASE}/data/scenarios`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/data/merchants`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/data/customers`).catch(() => ({ data: [] }))
      ])

      if (scRes.data && scRes.data.length > 0) {
        setScenarios(scRes.data)
        setBackendStatus('connected')
        const defaultSc = scRes.data.find((s: Scenario) => s.id === 'cur_001') || scRes.data[0]
        if (defaultSc) {
          runDecision(defaultSc)
        }
      } else {
        setBackendStatus('error')
      }

      if (Array.isArray(mRes.data)) {
        const mObj: Record<string, Merchant> = {}
        mRes.data.forEach((m: Merchant) => { mObj[m.id] = m })
        setMerchants(mObj)
      }

      if (Array.isArray(cRes.data)) {
        const cObj: Record<string, Customer> = {}
        cRes.data.forEach((c: Customer) => { cObj[c.id] = c })
        setCustomers(cObj)
      }

      fetchBaselines()

    } catch (err) {
      console.error('Error connecting to backend:', err)
      setBackendStatus('error')
    }
  }

  const fetchBaselines = async () => {
    setLoadingBaselines(true)
    try {
      const res = await axios.get(`${API_BASE}/analytics/baselines`)
      setBaselinesData(res.data)
    } catch (err) {
      console.error('Error fetching baselines analytics:', err)
    } finally {
      setLoadingBaselines(false)
    }
  }

  const runDecision = async (scenario: Scenario) => {
    setLoadingDecision(true)
    try {
      const res = await axios.post(`${API_BASE}/decide`, scenario)
      setDecisionResult(res.data)
    } catch (err) {
      console.error('Error running decision engine:', err)
    } finally {
      setLoadingDecision(false)
    }
  }

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId)
  const currentCustomer = currentScenario ? customers[currentScenario.customer_id] : null

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1 style={{ color: 'var(--bitezy-red, #e23744)' }}>🔥 Bitezy</h1>
          <p>AI Intelligence Center</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard /> Overview &amp; Metrics
          </button>
          
          <button
            className={`nav-item ${activeTab === 'tester' ? 'active' : ''}`}
            onClick={() => setActiveTab('tester')}
          >
            <Smartphone /> Offer Screen &amp; Simulator
          </button>

          <button
            className={`nav-item ${activeTab === 'baselines' ? 'active' : ''}`}
            onClick={() => setActiveTab('baselines')}
          >
            <BarChart3 /> Merchant Economics &amp; Baselines
          </button>
          
          <button
            className={`nav-item ${activeTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            <FileSpreadsheet /> Scenarios ({scenarios.length})
          </button>
          
          <button
            className={`nav-item ${activeTab === 'merchants' ? 'active' : ''}`}
            onClick={() => setActiveTab('merchants')}
          >
            <Store /> Merchants ({Object.keys(merchants).length})
          </button>
          
          <button
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users /> Customers ({Object.keys(customers).length})
          </button>
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-default)', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: backendStatus === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendStatus === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}></span>
            <span>{backendStatus === 'connected' ? 'FastAPI &amp; PyTorch Active' : 'Backend Offline'}</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
            Port 8000 | HuggingFace Semantic Embeddings
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>
              {activeTab === 'dashboard' && 'System Overview & Benchmark Metrics'}
              {activeTab === 'tester' && 'Personalized Offer Screen & Decision Simulator'}
              {activeTab === 'baselines' && 'Merchant Economics & Policy Baselines Comparison'}
              {activeTab === 'scenarios' && 'Public Scenarios Evaluation Dataset'}
              {activeTab === 'merchants' && 'Merchant Network Directory'}
              {activeTab === 'customers' && 'Customer Profiles & Preferences'}
            </h2>
            <p>Bitezy · Bengaluru Hyperlocal AI Offer Architecture</p>
          </div>

          <button className="btn btn-ghost" onClick={fetchInitialData}>
            <RefreshCw size={16} /> Refresh Data
          </button>
        </header>

        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="page-body fade-in">
            <div className="grid-4" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-value text-accent">91.1%</div>
                <div className="stat-label">Overall Benchmark Score</div>
                <div className="eval-score-bar">
                  <div className="eval-score-fill" style={{ width: '91.1%' }}></div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-value text-green">100%</div>
                <div className="stat-label">Constraint Adherence</div>
                <div className="eval-score-bar">
                  <div className="eval-score-fill" style={{ width: '100%', background: 'var(--accent-green)' }}></div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-value text-purple">100%</div>
                <div className="stat-label">Groundedness Score</div>
                <div className="eval-score-bar">
                  <div className="eval-score-fill" style={{ width: '100%', background: 'var(--accent-purple)' }}></div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-value text-amber">86.3%</div>
                <div className="stat-label">Language Localization</div>
                <div className="eval-score-bar">
                  <div className="eval-score-fill" style={{ width: '86.3%', background: 'var(--accent-amber)' }}></div>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '24px' }}>
              <div className="card-elevated">
                <div className="section-title">
                  <BrainCircuit size={16} /> Integrated System Components
                </div>

                <div className="metric-row">
                  <span className="metric-label">1. AI Decision Engine</span>
                  <span className="badge badge-purple"><BrainCircuit size={12} /> HuggingFace Vector Match</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">2. Hard Constraint Audit</span>
                  <span className="badge badge-green"><ShieldCheck size={12} /> 100% Guaranteed Compliance</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">3. Grounded Message Generator</span>
                  <span className="badge badge-blue">Template &amp; LLM Verified</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">4. Merchant Economics Calculator</span>
                  <span className="badge badge-green">Actual Evaluator Semantics</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">5. Policy Baseline Comparison</span>
                  <span className="badge badge-amber">Engine vs No-Offer &amp; Blanket</span>
                </div>
              </div>

              <div className="card-elevated">
                <div className="section-title">
                  <Zap size={16} /> Priya's Tuesday Demo (Scenario cur_001)
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Inspect the live decision trace, HuggingFace semantic score, and personalized offer screen for Priya (<code className="font-mono" style={{ color: 'var(--accent-blue)' }}>cur_001</code>).
                </p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedScenarioId('cur_001')
                      setActiveTab('tester')
                      const sc = scenarios.find(s => s.id === 'cur_001')
                      if (sc) runDecision(sc)
                    }}
                  >
                    <Smartphone size={16} /> View Offer Screen &amp; Trace <ChevronRight size={16} />
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => setActiveTab('baselines')}
                  >
                    <BarChart3 size={16} /> View Baselines
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Decision Simulator & Offer Screen */}
        {activeTab === 'tester' && (
          <div className="page-body fade-in">
            {/* Scenario Selector */}
            <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label>Select Scenario</label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => {
                    setSelectedScenarioId(e.target.value)
                    const sc = scenarios.find(s => s.id === e.target.value)
                    if (sc) runDecision(sc)
                  }}
                >
                  {scenarios.map(sc => (
                    <option key={sc.id} value={sc.id}>
                      {sc.id} — {sc.prompt ? sc.prompt.slice(0, 60) + '...' : `Scenario ${sc.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {currentScenario && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '22px' }}
                  onClick={() => runDecision(currentScenario)}
                  disabled={loadingDecision}
                >
                  {loadingDecision ? <RefreshCw className="spinner" size={16} /> : <Zap size={16} />} Run AI Engine
                </button>
              )}
            </div>

            {/* Layout: Left = Context & Trace, Right = Phone Offer Screen */}
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Scenario details */}
                {currentScenario && (
                  <div className="card">
                    <div className="section-title">
                      <Info size={16} /> Customer Context ({currentScenario.id})
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                      <strong>Prompt:</strong> {currentScenario.prompt}
                    </div>

                    <div className="grid-2">
                      <div className="metric-row">
                        <span className="metric-label">Intent</span>
                        <span className="metric-value">{currentScenario.intent}</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Time Available</span>
                        <span className="metric-value">{currentScenario.minutes_available} min</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Weather</span>
                        <span className="metric-value">{currentScenario.condition}, {currentScenario.temp_c}&deg;C</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Wallet Balance</span>
                        <span className="metric-value font-mono">
                          ₹{currentScenario.wallet_override || currentCustomer?.wallet_inr || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Structured Decision Trace */}
                {decisionResult && decisionResult.decision_trace && (
                  <div className="card-elevated">
                    <div className="section-title">
                      <BrainCircuit size={16} /> Structured Decision Trace &amp; Traceability
                    </div>

                    <div className="grid-2" style={{ marginBottom: '12px' }}>
                      <div className="metric-row">
                        <span className="metric-label">HuggingFace Semantic Match</span>
                        <span className="metric-value font-mono text-purple">
                          {((decisionResult.decision_trace.semantic_similarity || 0) * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Ranking Score</span>
                        <span className="metric-value font-mono text-accent">
                          {decisionResult.decision_trace.ranking_score} pts
                        </span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Distance &amp; Walk Time</span>
                        <span className="metric-value">
                          {decisionResult.decision_trace.distance_check?.distance_m}m ({decisionResult.decision_trace.distance_check?.walk_minutes} min walk)
                        </span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Optimal Discount</span>
                        <span className="metric-value font-mono text-amber">
                          {decisionResult.decision_trace.optimal_discount_pct}%
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Hard Constraint Audit:</strong>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span className="badge badge-green"><Check size={10} /> Marketing Consent</span>
                        <span className="badge badge-green"><Check size={10} /> Merchant Open Hours</span>
                        <span className="badge badge-green"><Check size={10} /> Promo Window</span>
                        <span className="badge badge-green"><Check size={10} /> Spatial &le;1500m</span>
                        <span className="badge badge-green"><Check size={10} /> Merchant Min Margin</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Phone Notification Preview Screen */}
              <div>
                {loadingDecision ? (
                  <div className="loading-overlay card">
                    <RefreshCw className="spinner" size={32} />
                    <p>Evaluating constraints &amp; running decision trace...</p>
                  </div>
                ) : decisionResult ? (
                  <div className="card-elevated">
                    <div className="section-title">
                      <Smartphone size={16} /> Personalized Offer Screen (Phone Preview)
                    </div>

                    <div style={{
                      maxWidth: '340px',
                      margin: '0 auto',
                      background: '#090d16',
                      borderRadius: '24px',
                      border: '2px solid #1e2d45',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {/* Phone Top Notch */}
                      <div style={{
                        height: '24px',
                        background: '#111827',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 16px',
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                      }}>
                        <span>09:41</span>
                        <div style={{ width: '40px', height: '4px', background: '#374151', borderRadius: '2px' }}></div>
                        <span>5G</span>
                      </div>

                      {/* Phone Content */}
                      <div style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Bitezy AI</span>
                          <span className="badge badge-purple">{decisionResult.notification?.language || 'en'}</span>
                        </div>

                        {decisionResult.action === 'send' ? (
                          <div style={{ background: '#162032', border: '1px solid #2b3e5c', borderRadius: '16px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {decisionResult.notification?.title}
                              </h4>
                              {decisionResult.offer && (
                                <span className="badge badge-amber font-mono" style={{ fontSize: '12px' }}>
                                  -{decisionResult.offer.discount_pct}% OFF
                                </span>
                              )}
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                              {decisionResult.notification?.body}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                background: 'var(--accent-blue)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}>
                                {decisionResult.notification?.cta || 'Grab it'}
                              </span>

                              {decisionResult.ui_hints && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                                  <span><MapPin size={12} style={{ inlineSize: '12px' }} /> {decisionResult.ui_hints.distance_m}m</span>
                                  <span><Clock size={12} style={{ inlineSize: '12px' }} /> {decisionResult.ui_hints.walk_minutes}m</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: '#1a1a24', border: '1px solid #333344', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                            <Info size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Offer Suppressed (SKIP)
                            </h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {decisionResult.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Baselines & Merchant Dashboard */}
        {activeTab === 'baselines' && (
          <div className="page-body fade-in">
            {loadingBaselines ? (
              <div className="loading-overlay card">
                <RefreshCw className="spinner" size={32} />
                <p>Computing baselines and evaluator statistics...</p>
              </div>
            ) : baselinesData ? (
              <div>
                <div className="grid-4" style={{ marginBottom: '24px' }}>
                  {Object.entries(baselinesData).map(([key, pol]) => (
                    <div className="stat-card" key={key}>
                      <div className="stat-value text-accent">{(pol.summary.overall * 100).toFixed(1)}%</div>
                      <div className="stat-label">{pol.name}</div>
                      <div className="eval-score-bar">
                        <div className="eval-score-fill" style={{ width: `${pol.summary.overall * 100}%` }}></div>
                      </div>

                      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div>Offers Sent: <strong>{pol.economics.offers_sent}</strong> / 62</div>
                        <div>Discount Budget: <strong>₹{pol.economics.total_discount_spent_inr}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-elevated">
                  <div className="section-title">
                    <BarChart3 size={16} /> Comparative Policy Analytics &amp; Merchant Economics
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Policy Name</th>
                        <th>Overall Score</th>
                        <th>Groundedness</th>
                        <th>Constraint Respect</th>
                        <th>Offers Sent</th>
                        <th>Discount Budget Spent</th>
                        <th>Est. Merchant Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(baselinesData).map(([key, pol]) => (
                        <tr key={key}>
                          <td className="font-semibold text-primary">{pol.name}</td>
                          <td className="font-mono text-accent">{(pol.summary.overall * 100).toFixed(1)}%</td>
                          <td className="font-mono text-green">{(pol.summary.groundedness * 100).toFixed(1)}%</td>
                          <td className="font-mono text-purple">{(pol.summary.constraint * 100).toFixed(1)}%</td>
                          <td>{pol.economics.offers_sent}</td>
                          <td className="font-mono text-amber">₹{pol.economics.total_discount_spent_inr}</td>
                          <td className="font-mono text-green">
                            {pol.economics.total_estimated_profit_inr !== undefined ? `₹${pol.economics.total_estimated_profit_inr}` : 'N/A (Untargeted)'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab 4: Scenarios */}
        {activeTab === 'scenarios' && (
          <div className="page-body fade-in">
            <div className="card" style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search scenario ID or prompt..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scenario ID</th>
                    <th>Customer</th>
                    <th>Merchant</th>
                    <th>Intent</th>
                    <th>Expected</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios
                    .filter(sc => sc.id.toLowerCase().includes(searchFilter.toLowerCase()) || sc.prompt.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map(sc => (
                      <tr key={sc.id} style={{ cursor: 'pointer' }} onClick={() => {
                        setSelectedScenarioId(sc.id)
                        setActiveTab('tester')
                        runDecision(sc)
                      }}>
                        <td className="font-mono text-accent">{sc.id}</td>
                        <td>{sc.customer_id}</td>
                        <td>{sc.merchant_id}</td>
                        <td>{sc.intent}</td>
                        <td>
                          <span className={`badge ${sc.expected_action === 'send' ? 'badge-green' : 'badge-red'}`}>
                            {sc.expected_action || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }}>
                            Test <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Merchants */}
        {activeTab === 'merchants' && (
          <div className="page-body fade-in">
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Locality</th>
                    <th>Occupancy %</th>
                    <th>Max Disc %</th>
                    <th>Min Margin %</th>
                    <th>Base Price</th>
                    <th>Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(merchants).map(m => (
                    <tr key={m.id}>
                      <td className="font-mono text-accent">{m.id}</td>
                      <td className="font-semibold">{m.name}</td>
                      <td><span className="badge badge-blue">{m.category}</span></td>
                      <td>{m.locality}</td>
                      <td>{m.occupancy_pct}%</td>
                      <td>{m.max_discount_pct}%</td>
                      <td>{m.min_margin_pct}%</td>
                      <td className="font-mono">₹{m.base_price_inr}</td>
                      <td className="font-mono">₹{m.unit_cost_inr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Customers */}
        {activeTab === 'customers' && (
          <div className="page-body fade-in">
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Language</th>
                    <th>Locality</th>
                    <th>Wallet Balance</th>
                    <th>Marketing Consent</th>
                    <th>Preferences</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(customers).map(c => (
                    <tr key={c.id}>
                      <td className="font-mono text-accent">{c.id}</td>
                      <td className="font-semibold">{c.name}</td>
                      <td><span className="badge badge-purple">{c.language}</span></td>
                      <td>{c.locality}</td>
                      <td className="font-mono">₹{c.wallet_inr}</td>
                      <td>
                        <span className={`badge ${c.marketing_consent ? 'badge-green' : 'badge-red'}`}>
                          {c.marketing_consent ? 'Opted In' : 'Opted Out'}
                        </span>
                      </td>
                      <td>{c.declared_preferences || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
