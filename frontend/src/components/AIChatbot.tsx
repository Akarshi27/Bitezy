import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Send, Trash2, Bot, User, CheckCircle2, XCircle, Globe, RefreshCw, ShoppingBag
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

interface AIChatbotProps {
  activeCustomer: any
  onAddToCart?: (item: any, discountPct?: number) => void
}

interface ChatMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  offers?: any[]
  followUp?: string
  timestamp: string
}

export default function AIChatbot({ activeCustomer, onAddToCart }: AIChatbotProps) {
  const [language, setLanguage] = useState<'en' | 'hi' | 'hi-en' | 'kn-en' | 'ta-en' | 'te-en'>(() => {
    return (activeCustomer?.language as any) || 'en'
  })

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'ai',
      text: "👋 Hi! I'm Bitzy, your AI Food Assistant powered by our PyTorch ML Model & Decision Engine. Tell me what you're craving, your budget, or walk time, and I'll find the smartest deals for you!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  const [context, setContext] = useState<any>({})
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [respondedOfferIds, setRespondedOfferIds] = useState<Record<string, 'accepted' | 'rejected'>>({})

  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const exampleQueries = [
    "I want spicy South Indian food under ₹150, within 10 min walk",
    "Mujhe ₹150 ke andar vegetarian South Indian food chahiye",
    "Quick coffee & snack under ₹100",
    "Increase my budget to ₹250"
  ]

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText
    if (!query.trim() || loading) return

    const userMsgId = `usr_${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInputText('')
    setLoading(true)

    try {
      const custId = activeCustomer?.id || 'c_020'
      const token = localStorage.getItem('bitezy_customer_token')
      const headers: any = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await axios.post(`${API_BASE}/customer/chat`, {
        customer_id: custId,
        message: query,
        language: language,
        context: context
      }, { headers })

      if (res.data) {
        if (res.data.context) setContext(res.data.context)

        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: res.data.response_text || "Here are your top recommendations:",
          offers: res.data.offers || [],
          followUp: res.data.follow_up_prompt,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setMessages(prev => [...prev, aiMsg])
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ ${err.response?.data?.detail || "Sorry, I ran into an error processing your request. Please try again."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleOfferResponse = async (offer: any, action: 'accepted' | 'rejected') => {
    try {
      await axios.post(`${API_BASE}/offer/respond`, {
        offer_id: offer.offer_id || `off_${offer.item_id}`,
        scenario_id: offer.scenario_id || `scen_${offer.merchant_id}`,
        customer_id: activeCustomer?.id || 'c_020',
        merchant_id: offer.merchant_id,
        item_id: offer.item_id,
        action: action,
        discount_pct: offer.discount_pct,
        final_price_inr: offer.discounted_price,
        ml_model_score: offer.ml_model_score
      })

      setRespondedOfferIds(prev => ({ ...prev, [offer.offer_id]: action }))

      if (action === 'accepted' && onAddToCart) {
        onAddToCart({
          id: offer.item_id,
          title: offer.item_name,
          price_inr: offer.discounted_price,
          merchant_id: offer.merchant_id,
          merchant_name: offer.merchant_name,
          image_url: offer.item_image
        }, offer.discount_pct)
      }
    } catch (err) {
      console.error('Failed to record offer response:', err)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_1',
        sender: 'ai',
        text: "👋 Chat cleared! Tell me what food you're looking for.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
    setContext({})
  }

  return (
    <div className="card-elevated" style={{
      display: 'flex', flexDirection: 'column', height: 600,
      background: 'var(--bg-elevated)', borderRadius: 16,
      border: '1px solid var(--border-default)', overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{
        padding: '12px 18px', background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--bitezy-red)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Bitzy AI Assistant</span>
              <span className="badge badge-red" style={{ fontSize: 10 }}>PyTorch ML Inside</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Multilingual Intent • Decision Engine • Real-time Scoring
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border-default)' }}>
            <Globe size={13} style={{ color: 'var(--text-muted)' }} />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi</option>
              <option value="hi-en">🔤 Hinglish</option>
              <option value="kn-en">💛 Kannada</option>
              <option value="ta-en">🌴 Tamil</option>
              <option value="te-en">🏛️ Telugu</option>
            </select>
          </div>

          <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }} onClick={handleClearChat} title="Clear conversation">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Active Context Banner */}
      {Object.keys(context).length > 0 && (
        <div style={{
          padding: '6px 16px', background: 'var(--bitezy-red-light)',
          borderBottom: '1px solid rgba(226,55,68,0.2)', fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--bitezy-red)', fontWeight: 600
        }}>
          <span>
            🎯 Active Filters: {context.food_preference ? `Craving: ${context.food_preference.replace('_', ' ').toUpperCase()}` : ''}
            {context.food_type ? ` • ${context.food_type.toUpperCase()}` : ''}
            {context.budget ? ` • Max ₹${context.budget}` : ''}
            {context.max_distance_m ? ` • ${int(context.max_distance_m / 80)}m walk` : ''}
          </span>
          <button onClick={() => setContext({})} style={{ background: 'none', border: 'none', color: 'var(--bitezy-red)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textDecoration: 'underline' }}>
            Reset Filters
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex', gap: 10,
            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
          }}>
            {msg.sender === 'ai' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bitezy-red)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2
              }}>
                <Bot size={16} />
              </div>
            )}

            <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Message Bubble */}
              <div style={{
                padding: '12px 16px', borderRadius: 16,
                background: msg.sender === 'user' ? 'var(--bitezy-red)' : 'var(--bg-card)',
                color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-default)',
                boxShadow: msg.sender === 'user' ? 'var(--shadow-red)' : 'none',
                whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.5
              }}>
                {msg.text}
              </div>

              {/* Embedded Offer Cards */}
              {msg.offers && msg.offers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  {msg.offers.map((off: any, idx: number) => {
                    const status = respondedOfferIds[off.offer_id]

                    return (
                      <div key={off.offer_id || idx} style={{
                        padding: 12, borderRadius: 12,
                        background: 'var(--bg-primary)', border: '1px solid var(--border-light)',
                        display: 'flex', flexDirection: 'column', gap: 8
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{off.merchant_name}</div>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>{off.item_name}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 900 }}>
                              🤖 ML Match: {off.ml_match_pct}%
                            </span>
                          </div>
                        </div>

                        {/* Price & Details */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--bitezy-red)' }}>₹{off.discounted_price}</span>
                            {off.discount_pct > 0 && (
                              <>
                                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12 }}>₹{off.original_price}</span>
                                <span style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 800 }}>({off.discount_pct}% OFF)</span>
                              </>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            📍 {off.distance_m}m • 🏃 {off.walk_minutes} min walk
                          </div>
                        </div>

                        {/* ML Explanation */}
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>
                          💡 {off.explanation}
                        </div>

                        {/* Actions */}
                        {status ? (
                          <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 0', color: status === 'accepted' ? 'var(--accent-green)' : 'var(--bitezy-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {status === 'accepted' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {status === 'accepted' ? 'Offer Accepted & Added to Cart!' : 'Offer Passed'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px 10px' }}
                              onClick={() => handleOfferResponse(off, 'accepted')}
                            >
                              <ShoppingBag size={13} /> Accept & Add to Cart
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ justifyContent: 'center', fontSize: 12, padding: '6px 10px' }}
                              onClick={() => handleOfferResponse(off, 'rejected')}
                            >
                              <XCircle size={13} /> Pass
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Follow up prompt if any */}
              {msg.followUp && (
                <div style={{ fontSize: 12, color: 'var(--bitezy-red)', fontWeight: 600, padding: '4px 8px', background: 'var(--bitezy-red-light)', borderRadius: 8 }}>
                  ❓ {msg.followUp}
                </div>
              )}

              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2, fontWeight: 800, fontSize: 12
              }}>
                {activeCustomer?.name?.[0]?.toUpperCase() || <User size={16} />}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bitezy-red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} />
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 16, border: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={14} className="spinner" /> Bitzy is extracting requirements & running PyTorch ML predictions...
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggested Example Queries */}
      <div style={{ padding: '8px 16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {exampleQueries.map((query, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(query)}
            style={{
              padding: '4px 10px', borderRadius: 20,
              border: '1px solid var(--border-default)', background: 'var(--bg-primary)',
              color: 'var(--text-secondary)', fontSize: 11.5, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0
            }}
          >
            💬 {query}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div style={{ padding: 12, background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)', display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Bitzy in English, Hindi, Hinglish... (e.g. 'South Indian food under ₹150')"
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border-default)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontSize: 13.5
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSendMessage()}
          disabled={loading || !inputText.trim()}
          style={{ padding: '0 18px', gap: 6 }}
        >
          <Send size={15} /> Send
        </button>
      </div>

    </div>
  )
}

function int(val: number): number {
  return Math.round(val)
}
