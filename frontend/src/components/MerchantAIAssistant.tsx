import { useState } from 'react'
import axios from 'axios'
import {
  Bot,
  Send,
  Sparkles,
  Package,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Globe
} from 'lucide-react'
import type { MerchantLang } from '../i18n/merchantLocales'
import { tMerchant } from '../i18n/merchantLocales'

const API_BASE = 'http://localhost:8000'

interface MerchantAIAssistantProps {
  merchantId: string
  merchantProfile: any
  currentLanguage: MerchantLang
  onLanguageChange: (lang: MerchantLang) => void
  onOfferPublished?: () => void
}

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  data?: any
}

const SAMPLE_QUERIES: Record<MerchantLang, string[]> = {
  en: [
    "Which items should I promote today while maintaining my margin?",
    "Show low stock inventory alerts and preparation needs.",
    "Summarize my offer acceptance rate and profitability.",
    "Suggest an optimal discount for my surplus stock."
  ],
  'hi-en': [
    "Aaj kaun se items par offer dena profitable rahega?",
    "Low stock items aur inventory alerts dikhao.",
    "Puraane offers ka acceptance rate aur profit batayein.",
    "Surplus stock ke liye best discount suggest karein."
  ],
  hi: [
    "आज किन आइटम्स पर ऑफर देना मेरे मार्जिन के लिए सही रहेगा?",
    "कम स्टॉक वाली सामग्री और इन्वेंट्री अलर्ट दिखाएं।",
    "मेरे पुराने ऑफ़र की स्वीकृति दर और लाभप्रदता का सारांश दें।",
    "अतिरिक्त स्टॉक के लिए इष्टतम छूट का सुझाव दें।"
  ],
  'kn-en': [
    "Yaavude items nalli discount kottare profit barutthe?",
    "Low stock inventory alerts batasi.",
    "Nanna offer acceptance rate mattu profit kodi.",
    "Surplus items ge best offer suggest maadi."
  ],
  'ta-en': [
    "Enna items ku offer potta profit kidaikkum?",
    "Low stock inventory alerts kaattungal.",
    "Enudaiya offer acceptance rate matrum profit sollungal.",
    "Surplus stock ku nalla discount suggest seyyavum."
  ],
  'te-en': [
    "Eyy items meeda discount iste profit vastundi?",
    "Low stock inventory alerts chupinchandi.",
    "Naa offer acceptance rate mariyu profit cheppandi.",
    "Surplus stock ki manchi discount suggest cheyandi."
  ]
}

export default function MerchantAIAssistant({
  merchantId,
  merchantProfile,
  currentLanguage,
  onLanguageChange,
  onOfferPublished
}: MerchantAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `${tMerchant('ai_assistant_title', currentLanguage)} — ${tMerchant('ai_assistant_subtitle', currentLanguage)}.\n\nAsk me about inventory stock, profit margins, offer performance, or promotional recommendations grounded in your store's live data!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishedSuccess, setPublishedSuccess] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const handleSend = async (userQuery?: string) => {
    const textToSend = userQuery || input
    if (!textToSend.trim() || loading) return

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    if (!userQuery) setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('bitezy_merchant_token') || ''
      const res = await axios.post(`${API_BASE}/merchant/chat`, {
        merchant_id: merchantId,
        message: textToSend,
        language: currentLanguage
      }, {
        headers: token ? { Authorization: token } : {}
      })

      const data = res.data
      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: data.response_text || 'No response received from assistant.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: data
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      console.error('Merchant chat error:', err)
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Unable to connect to AI Assistant: ${err.response?.data?.detail || err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleApproveDraftOffer = async (draft: any) => {
    const token = localStorage.getItem('bitezy_merchant_token')
    if (!token) {
      setPublishError("Partner Authentication Required: Please sign in to publish live offers.")
      return
    }

    setPublishingId(draft.item_id)
    setPublishError(null)
    setPublishedSuccess(null)

    try {
      const payload = {
        title: draft.title,
        description: draft.description || `Special AI suggested promotion for ${draft.item_name}`,
        item_id: draft.item_id,
        discount_pct: draft.discount_pct,
        base_price_inr: draft.base_price_inr,
        valid_minutes: draft.valid_minutes || 60,
        max_redemptions: draft.max_redemptions || 30
      }

      await axios.post(`${API_BASE}/merchant/offers/${merchantId}`, payload, {
        headers: { Authorization: token }
      })

      setPublishedSuccess(`✓ Successfully published "${draft.title}" to Bitezy Live Storefront!`)
      if (onOfferPublished) onOfferPublished()
    } catch (err: any) {
      console.error("Publish error:", err)
      setPublishError(err.response?.data?.detail || "Failed to publish offer.")
    } finally {
      setPublishingId(null)
    }
  }

  const sampleList = SAMPLE_QUERIES[currentLanguage] || SAMPLE_QUERIES['en']

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[750px]">
      {/* Top Header Controls */}
      <div className="bg-slate-950/80 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {tMerchant('ai_assistant_title', currentLanguage)}
              <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                Data-Grounded
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {merchantProfile?.name || 'Partner Cafe'} • {tMerchant('ai_assistant_subtitle', currentLanguage)}
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5">
          <Globe className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-slate-300">Language:</span>
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value as MerchantLang)}
            className="bg-transparent text-xs font-semibold text-amber-300 border-none outline-none cursor-pointer pr-1"
          >
            <option value="en" className="bg-slate-900 text-white">English</option>
            <option value="hi" className="bg-slate-900 text-white">Hindi (हिंदी)</option>
            <option value="hi-en" className="bg-slate-900 text-white">Hinglish</option>
            <option value="kn-en" className="bg-slate-900 text-white">Kannada-English</option>
            <option value="ta-en" className="bg-slate-900 text-white">Tamil-English</option>
            <option value="te-en" className="bg-slate-900 text-white">Telugu-English</option>
          </select>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>

              {/* Render Structured Metrics & Draft Offer Card if returned */}
              {msg.data && (
                <div className="mt-4 space-y-3 pt-3 border-t border-slate-700/70">
                  {/* Summary Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50 flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Low Stock</div>
                        <div className="text-xs font-bold text-emerald-300">
                          {msg.data.inventory_summary?.low_stock_count || 0} items
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Accept Rate</div>
                        <div className="text-xs font-bold text-amber-300">
                          {msg.data.performance_summary?.acceptance_rate_pct || 0}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50 flex items-center gap-2 col-span-2 sm:col-span-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Margin Bounds</div>
                        <div className="text-xs font-bold text-indigo-300">
                          Min {merchantProfile?.min_margin_pct || 15}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Draft Offer Card requiring merchant approval */}
                  {msg.data.draft_offer && (
                    <div className="bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Draft Offer Prepared
                        </span>
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                          Requires Approval
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-base text-white">{msg.data.draft_offer.title}</h4>
                          <p className="text-xs text-slate-300 mt-1">{msg.data.draft_offer.description}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <div className="text-sm line-through text-slate-400">₹{msg.data.draft_offer.base_price_inr}</div>
                          <div className="text-lg font-black text-amber-400">₹{msg.data.draft_offer.final_price_inr}</div>
                          <div className="text-[10px] text-emerald-400 font-semibold">{msg.data.draft_offer.discount_pct}% OFF</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-400">Est. Profit/Unit: </span>
                          <span className="font-bold text-emerald-300">₹{msg.data.draft_offer.estimated_profit_inr}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Profit Margin: </span>
                          <span className="font-bold text-indigo-300">{msg.data.draft_offer.profit_margin_pct}%</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => handleApproveDraftOffer(msg.data.draft_offer)}
                          disabled={publishingId === msg.data.draft_offer.item_id}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs"
                        >
                          {publishingId === msg.data.draft_offer.item_id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" /> Publishing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-white" />
                              {tMerchant('approve_publish', currentLanguage)}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[10px] opacity-60 mt-2 text-right">{msg.timestamp}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 bg-slate-800/60 text-slate-400 p-3 rounded-2xl w-fit border border-slate-700/50">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span className="text-xs font-medium">Analyzing stock, profit margins & offer stats...</span>
          </div>
        )}

        {publishedSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {publishedSuccess}
            </span>
            <button onClick={() => setPublishedSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {publishError && (
          <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 p-3 rounded-xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400" /> {publishError}
            </span>
            <button onClick={() => setPublishError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Suggested Query Chips */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Quick Prompts:
          </span>
          {sampleList.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sample)}
              disabled={loading}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs px-3 py-1.5 rounded-full border border-slate-700 transition-all font-medium whitespace-nowrap"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask AI Assistant in ${currentLanguage.toUpperCase()}...`}
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold p-3 rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
