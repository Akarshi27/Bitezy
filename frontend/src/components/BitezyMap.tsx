import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix leaflet default icon paths broken by bundlers
import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

// Red pin for merchants with active offers
const RedIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg,#e23744,#c0392b);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(226,55,68,0.5);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
})

// Orange pin for merchants without active offers
const OrangeIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 24px; height: 24px;
    background: linear-gradient(135deg,#f39c12,#e67e22);
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(243,156,18,0.4);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
})

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946]

const LOCALITY_COORDS: Record<string, [number, number]> = {
  'Koramangala':   [12.9352, 77.6245],
  'Indiranagar':   [12.9784, 77.6408],
  'HSR Layout':    [12.9116, 77.6389],
  'Whitefield':    [12.9698, 77.7500],
  'Marathahalli':  [12.9563, 77.7010],
  'BTM Layout':    [12.9165, 77.6101],
  'Jayanagar':     [12.9267, 77.5935],
  'Malleshwaram':  [13.0031, 77.5662],
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

interface BitezyMapProps {
  merchants: any[]
  activeOffers: any[]
  customerLat?: number
  customerLng?: number
  locality?: string
  maxDistanceM?: number
  onMerchantClick?: (merchant: any) => void
}

export default function BitezyMap({
  merchants,
  activeOffers,
  customerLat,
  customerLng,
  locality = 'Koramangala',
  maxDistanceM = 2000,
  onMerchantClick,
}: BitezyMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const circlesRef = useRef<L.Circle[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Build lookup: merchant_id → active offer
  const offerByMerchant = new Map<string, any>()
  for (const o of activeOffers) {
    if (!offerByMerchant.has(o.merchant_id)) {
      offerByMerchant.set(o.merchant_id, o)
    }
  }

  // Determine center
  const centerLat = customerLat ?? LOCALITY_COORDS[locality]?.[0] ?? BENGALURU_CENTER[0]
  const centerLng = customerLng ?? LOCALITY_COORDS[locality]?.[1] ?? BENGALURU_CENTER[1]

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    setMapReady(true)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Re-center when customer location changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    mapRef.current.setView([centerLat, centerLng], 14)
  }, [centerLat, centerLng, mapReady])

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const map = mapRef.current

    // Clear old markers + circles
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    circlesRef.current.forEach(c => c.remove())
    circlesRef.current = []

    // Distance radius circles
    const radiusSizes = [500, 1000, maxDistanceM]
    const radiusColors = ['rgba(226,55,68,0.06)', 'rgba(226,55,68,0.04)', 'rgba(226,55,68,0.02)']
    radiusSizes.forEach((r, i) => {
      const circle = L.circle([centerLat, centerLng], {
        radius: r,
        color: '#e23744',
        fillColor: radiusColors[i],
        fillOpacity: 1,
        weight: 1,
        dashArray: '4 4',
        opacity: 0.35,
      }).addTo(map)
      circlesRef.current.push(circle)
    })

    // Customer pin
    const custPin = L.circleMarker([centerLat, centerLng], {
      radius: 10,
      fillColor: '#3498db',
      color: '#fff',
      weight: 3,
      fillOpacity: 0.95,
    })
      .addTo(map)
      .bindPopup(`<b>📍 Your Location</b><br/>${locality}`)
    markersRef.current.push(custPin as any)

    // Merchant markers
    for (const m of merchants) {
      const lat = parseFloat(m.lat)
      const lng = parseFloat(m.lng)
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue

      const distM = haversine(centerLat, centerLng, lat, lng)
      if (distM > maxDistanceM * 1.5) continue // skip very far merchants

      const offer = offerByMerchant.get(m.id)
      const icon = offer ? RedIcon : OrangeIcon
      const walkMin = Math.round(distM / 80)

      const popupHtml = offer
        ? `
          <div style="font-family:Inter,sans-serif;min-width:220px;">
            <div style="font-weight:800;font-size:15px;color:#1a1a2e;margin-bottom:6px;">${m.name}</div>
            <div style="font-size:12px;color:#666;margin-bottom:8px;">📍 ${m.locality} · 🚶 ${walkMin} min (${Math.round(distM)}m)</div>
            <div style="background:linear-gradient(135deg,#e23744,#c0392b);border-radius:8px;padding:10px;color:#fff;margin-bottom:8px;">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px;">🔥 ${offer.title}</div>
              <div style="font-size:12px;opacity:0.9;">${offer.description || ''}</div>
              <div style="font-size:16px;font-weight:800;margin-top:6px;">
                ₹${offer.final_price_inr} <span style="text-decoration:line-through;opacity:0.6;font-size:12px;font-weight:400;">₹${offer.base_price_inr}</span>
                <span style="background:rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:11px;">${offer.discount_pct}% OFF</span>
              </div>
            </div>
            <div style="font-size:11px;color:#888;">Valid for ${offer.valid_minutes} min · ${offer.redemptions}/${offer.max_redemptions} redeemed</div>
          </div>`
        : `
          <div style="font-family:Inter,sans-serif;min-width:180px;">
            <div style="font-weight:800;font-size:14px;color:#1a1a2e;margin-bottom:4px;">${m.name}</div>
            <div style="font-size:12px;color:#666;">📍 ${m.locality}<br/>🚶 ${walkMin} min · ${Math.round(distM)}m away</div>
            <div style="font-size:11px;color:#888;margin-top:6px;">No active offers right now</div>
          </div>`

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 280 })

      marker.on('click', () => {
        if (onMerchantClick) onMerchantClick(m)
      })

      markersRef.current.push(marker)
    }
  }, [merchants, activeOffers, centerLat, centerLng, maxDistanceM, mapReady, locality])

  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
      <div ref={mapContainerRef} style={{ height: '440px', width: '100%' }} />

      {/* Map legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderRadius: '10px', padding: '8px 12px', fontSize: '11px', lineHeight: '1.8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 12, height: 12, background: '#e23744', borderRadius: '50%' }} />
          <span>Active offer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 12, height: 12, background: '#f39c12', borderRadius: '50%' }} />
          <span>No active offers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: '#3498db', borderRadius: '50%' }} />
          <span>Your location</span>
        </div>
      </div>

      {/* Offer count badge */}
      {offerByMerchant.size > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          background: 'linear-gradient(135deg,#e23744,#c0392b)',
          color: '#fff', borderRadius: '20px', padding: '4px 12px',
          fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(226,55,68,0.4)'
        }}>
          🔥 {offerByMerchant.size} live offer{offerByMerchant.size !== 1 ? 's' : ''} nearby
        </div>
      )}
    </div>
  )
}
