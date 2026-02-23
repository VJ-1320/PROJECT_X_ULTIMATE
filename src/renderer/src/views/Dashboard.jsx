/**
 * Dashboard.jsx — Project X Ultimate · Phase 3 Tactical Cartography
 *
 * Map fixes:
 * - ResizeObserver → map.invalidateSize() (no setTimeout)
 * - strict CSS isolation (isolate + overflow:hidden + z-index:0 on container)
 * - Leaflet container z-index pinned via injected CSS to never exceed parent
 *
 * New features:
 * - Live cursor telemetry (lat/lng HUD)
 * - Custom neon divIcon pins
 * - Polyline connecting all pins
 * - Haversine total distance (km + mi)
 * - Coordinate-jump search
 * - Clear pins command
 */
import React, {
  useEffect, useRef, useState, useCallback, useLayoutEffect,
} from 'react'
import {
  MapContainer, TileLayer, Marker, Polyline,
  useMap, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
// CRITICAL FIX: The missing CSS that caused the black screen
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store/useStore'

/* ══════════════════════════════════════════════════════════════════════════════
   LEAFLET Z-INDEX ISOLATION  —  injected once at module load
   Forces all Leaflet panes to stay under z-index 10 so they
   can never paint over our TitleBar (z:2000) or sidebars.
══════════════════════════════════════════════════════════════════════════════ */
;(function injectLeafletZFix() {
  if (document.getElementById('lz-fix')) return
  const style = document.createElement('style')
  style.id = 'lz-fix'
  style.textContent = `
    .leaflet-container { z-index: 0 !important; }
    .leaflet-pane      { z-index: 2 !important; }
    .leaflet-tile-pane { z-index: 2 !important; }
    .leaflet-overlay-pane { z-index: 3 !important; }
    .leaflet-marker-pane  { z-index: 4 !important; }
    .leaflet-tooltip-pane { z-index: 5 !important; }
    .leaflet-popup-pane   { z-index: 6 !important; }
    .leaflet-top, .leaflet-bottom { z-index: 7 !important; }
  `
  document.head.appendChild(style)
})()

/* ══════════════════════════════════════════════════════════════════════════════
   CUSTOM PIN ICON  —  neon cyan crosshair divIcon
══════════════════════════════════════════════════════════════════════════════ */
const makePinIcon = (index) => L.divIcon({
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `
    <div style="
      position:relative; width:20px; height:20px;
      display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        width:8px; height:8px; border-radius:50%;
        background:#00ffb3; box-shadow:0 0 10px #00ffb3, 0 0 20px #00ffb388;
        z-index:2; position:relative;
      "></div>
      <div style="
        position:absolute; top:50%; left:0; right:0; height:1px;
        background:rgba(0,255,179,0.45);
      "></div>
      <div style="
        position:absolute; left:50%; top:0; bottom:0; width:1px;
        background:rgba(0,255,179,0.45);
      "></div>
      <div style="
        position:absolute; top:-18px; left:50%; transform:translateX(-50%);
        font-family:monospace; font-size:9px; color:#00ffb3;
        white-space:nowrap; background:rgba(3,3,10,.75);
        padding:1px 4px; border:1px solid #00ffb344; border-radius:2px;
      ">${String(index + 1).padStart(2,'0')}</div>
    </div>
  `,
})

/* ══════════════════════════════════════════════════════════════════════════════
   HAVERSINE DISTANCE  (metres)
══════════════════════════════════════════════════════════════════════════════ */
function haversine(a, b) {
  const R   = 6371000
  const φ1  = a.lat * Math.PI / 180
  const φ2  = b.lat * Math.PI / 180
  const Δφ  = (b.lat - a.lat) * Math.PI / 180
  const Δλ  = (b.lng - a.lng) * Math.PI / 180
  const x   = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function totalDistance(pins) {
  if (pins.length < 2) return 0
  let d = 0
  for (let i = 1; i < pins.length; i++) d += haversine(pins[i-1], pins[i])
  return d
}

function fmtDist(metres) {
  const km = metres / 1000
  const mi = metres / 1609.344
  if (km < 1) return `${Math.round(metres)} m  /  ${(mi * 5280).toFixed(0)} ft`
  return `${km.toFixed(2)} km  /  ${mi.toFixed(2)} mi`
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAP CHILD COMPONENTS
══════════════════════════════════════════════════════════════════════════════ */

/** Watches container → invalidateSize on every resize change */
function SizeWatcher({ containerRef }) {
  const map = useMap()
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      // Use requestAnimationFrame to let CSS finish painting first
      requestAnimationFrame(() => map.invalidateSize({ animate: false }))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [map, containerRef])
  return null
}

/** Tracks mouse position + handles click-to-pin */
function MapInteractions({ onMove, onPinDrop }) {
  useMapEvents({
    mousemove: (e) => onMove(e.latlng),
    click:     (e) => onPinDrop(e.latlng),
  })
  return null
}

/** Exposes map instance upward via ref */
function MapRef({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMMAND HUD
══════════════════════════════════════════════════════════════════════════════ */
function CommandHUD({ cursor, pins, onClear, onJump }) {
  const [jumpInput, setJumpInput] = useState('')
  const dist = totalDistance(pins)

  const handleJump = () => {
    const parts = jumpInput.split(',').map(s => parseFloat(s.trim()))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      onJump({ lat: parts[0], lng: parts[1] })
      setJumpInput('')
    }
  }

  const row = (label, value) => (
    <div style={{ display:'flex', justifyContent:'space-between', gap:16, padding:'2px 0' }}>
      <span style={{ color:'var(--txt3)', letterSpacing:'.1em', flexShrink:0 }}>{label}</span>
      <span style={{ color:'var(--txt1)', letterSpacing:'.06em', textAlign:'right' }}>{value}</span>
    </div>
  )

  const shared = {
    background: 'transparent',
    border: '1px solid var(--bg4)',
    color: 'var(--txt1)',
    fontFamily: 'Share Tech Mono',
    fontSize: '.58rem',
    padding: '3px 8px',
    borderRadius: 3,
    cursor: 'pointer',
    letterSpacing: '.08em',
    outline: 'none',
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 14,
      left: 14,
      zIndex: 50,                    /* stays above map, below our real UI */
      background: 'rgba(3,3,10,0.88)',
      border: '1px solid var(--cb)',
      borderRadius: 6,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,.75)',
      padding: '12px 14px',
      minWidth: 260,
      fontFamily: 'Share Tech Mono',
      fontSize: '.58rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>

      {/* Header */}
      <div style={{
        fontFamily: 'Orbitron', fontSize: '.46rem', letterSpacing: '.3em',
        color: 'var(--c)', borderBottom: '1px solid var(--bg3)', paddingBottom: 6,
        marginBottom: 2,
      }}>
        ◈ TACTICAL HUD
      </div>

      {/* Telemetry rows */}
      {row('LAT', cursor ? cursor.lat.toFixed(6) : '—')}
      {row('LNG', cursor ? cursor.lng.toFixed(6) : '—')}
      {row('PINS', `${pins.length} WAYPOINT${pins.length !== 1 ? 'S' : ''}`)}
      {pins.length >= 2 && row('ROUTE', fmtDist(dist))}

      {/* Coordinate jump */}
      <div style={{
        display: 'flex', gap: 5, marginTop: 4, alignItems: 'center',
        borderTop: '1px solid var(--bg3)', paddingTop: 8,
      }}>
        <input
          value={jumpInput}
          onChange={e => setJumpInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJump()}
          placeholder="lat, lng"
          style={{
            ...shared,
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            cursor: 'text',
          }}
        />
        <button onClick={handleJump} style={{ ...shared }}>GO</button>
      </div>

      {/* Clear pins */}
      {pins.length > 0 && (
        <button
          onClick={onClear}
          style={{
            ...shared,
            borderColor: '#ff4466',
            color: '#ff4466',
            background: 'rgba(255,68,102,.06)',
          }}
        >
          ✕  CLEAR PINS
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   LEFT PANEL  —  ID card + clock + telemetry
══════════════════════════════════════════════════════════════════════════════ */
function LeftPanel() {
  const { user } = useStore()
  const [sys, setSys]     = useState(null)
  const [clock, setClock] = useState({ h:'--', m:'--', s:'--', date:'', tz:'' })

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT']
      const MONS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
      setClock({
        h:    String(n.getHours()).padStart(2,'0'),
        m:    String(n.getMinutes()).padStart(2,'0'),
        s:    String(n.getSeconds()).padStart(2,'0'),
        date: `${DAYS[n.getDay()]} ${n.getDate()} ${MONS[n.getMonth()]} ${n.getFullYear()}`,
        tz:   Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const fetch = () => window.px.getSysinfo().then(setSys)
    fetch()
    const id = setInterval(fetch, 5000)
    return () => clearInterval(id)
  }, [])

  const LEVEL_COLOR = { 1:'#8899aa', 2:'#f5a623', 3:'#5577ff', 4:'#00ffb3' }
  const LEVEL_NAME  = { 1:'UNCLASSIFIED', 2:'RESTRICTED', 3:'CLASSIFIED', 4:'DIRECTOR' }
  const lc     = LEVEL_COLOR[user?.clearanceLevel] || 'var(--txt3)'
  const ln     = LEVEL_NAME[user?.clearanceLevel]  || ''
  const ramPct = sys ? Math.round(((sys.memory.total-sys.memory.free)/sys.memory.total)*100) : 0
  const ramGB  = sys ? ((sys.memory.total-sys.memory.free)/1073741824).toFixed(1) : '—'
  const totGB  = sys ? (sys.memory.total/1073741824).toFixed(0) : '—'
  const upH    = sys ? Math.floor(sys.uptime/3600) : 0
  const upM    = sys ? Math.floor((sys.uptime%3600)/60) : 0

  const Bar = ({ pct, color='var(--c)' }) => (
    <div style={{ height:3, background:'var(--bg3)', borderRadius:2, overflow:'hidden', marginTop:3 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2, transition:'width .6s' }}/>
    </div>
  )

  const Label = ({ children }) => (
    <div style={{ fontFamily:'Orbitron', fontSize:'.43rem', letterSpacing:'.2em',
      color:'var(--txt3)', textTransform:'uppercase', marginBottom:8, marginTop:14 }}>
      // {children}
    </div>
  )

  return (
    <div style={{
      width:220, flexShrink:0, background:'var(--bg1)',
      borderRight:'1px solid var(--cb)',
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'14px 14px' }}>

        {/* ── ID Card ── */}
        <Label>Identification</Label>
        <div style={{
          width:44, height:44, borderRadius:'50%',
          background:lc, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'Orbitron', fontSize:'1.2rem', color:'var(--bg)',
          boxShadow:`0 0 16px ${lc}44`, marginBottom:10,
        }}>
          {(user?.username||'?')[0].toUpperCase()}
        </div>
        <div style={{
          fontFamily:'Orbitron', fontSize:'.7rem', fontWeight:700,
          color:'var(--txt)', letterSpacing:'.04em', marginBottom:6,
        }}>
          {user?.username?.toUpperCase() || '—'}
        </div>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:5,
          border:`1px solid ${lc}44`, borderRadius:4, padding:'3px 10px',
          fontFamily:'Share Tech Mono', fontSize:'.52rem', letterSpacing:'.1em', color:lc,
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:lc, boxShadow:`0 0 5px ${lc}` }}/>
          LVL {user?.clearanceLevel} · {ln}
        </div>

        {/* ── Clock ── */}
        <Label>Local Time</Label>
        <div style={{
          fontFamily:'Orbitron', fontSize:'1.35rem', fontWeight:900,
          lineHeight:1,
          background:'linear-gradient(135deg,#fff 30%,var(--c))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          marginBottom:4,
        }}>
          {clock.h}:{clock.m}<span style={{ fontSize:'.75rem', opacity:.5 }}>:{clock.s}</span>
        </div>
        <div style={{ fontFamily:'Share Tech Mono', fontSize:'.5rem', color:'var(--txt3)', letterSpacing:'.1em' }}>
          {clock.date}
        </div>
        <div style={{ fontFamily:'Share Tech Mono', fontSize:'.48rem', color:'var(--txt3)', letterSpacing:'.06em', marginTop:2 }}>
          {clock.tz}
        </div>

        {/* ── System Telemetry ── */}
        {sys && (
          <>
            <Label>System Telemetry</Label>

            <div style={{ fontFamily:'Share Tech Mono', fontSize:'.54rem', color:'var(--txt2)', marginBottom:2 }}>
              RAM {ramGB}/{totGB} GB ({ramPct}%)
            </div>
            <Bar pct={ramPct} color={ramPct > 85 ? '#ff4466' : 'var(--c)'} />

            <div style={{ fontFamily:'Share Tech Mono', fontSize:'.54rem', color:'var(--txt2)', marginBottom:2, marginTop:8 }}>
              UPTIME {String(upH).padStart(2,'0')}:{String(upM).padStart(2,'0')}
            </div>
            <Bar pct={100} color='var(--g)' />

            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:3 }}>
              {[
                ['HOST', sys.hostname],
                ['USER', sys.username],
                ['CPU',  sys.cpu?.model?.slice(0,24) || 'N/A'],
                ['OS',   `${sys.platform} ${sys.arch}`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', gap:8, fontFamily:'Share Tech Mono', fontSize:'.5rem' }}>
                  <span style={{ color:'var(--txt3)', flexShrink:0, width:32 }}>{k}</span>
                  <span style={{ color:'var(--txt2)', wordBreak:'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   RIGHT PANEL  —  quick-access command deck
══════════════════════════════════════════════════════════════════════════════ */
function RightPanel() {
  const { setActiveView } = useStore()

  const modules = [
    { key:'study',    icon:'✏️', label:'Study Hub' },
    { key:'todos',    icon:'✅', label:'Tasks' },
    { key:'journal',  icon:'📔', label:'Journal' },
    { key:'notes',    icon:'📝', label:'Notes' },
    { key:'music',    icon:'🎵', label:'Music' },
    { key:'apps',     icon:'🚀', label:'Launcher' },
    { key:'settings', icon:'⚙️', label:'Settings' },
  ]

  return (
    <div style={{
      width:180, flexShrink:0, background:'var(--bg1)',
      borderLeft:'1px solid var(--cb)',
      display:'flex', flexDirection:'column', overflow:'hidden', padding:'14px 10px',
    }}>
      <div style={{
        fontFamily:'Orbitron', fontSize:'.43rem', letterSpacing:'.2em',
        color:'var(--txt3)', marginBottom:12,
      }}>
        // COMMAND DECK
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {modules.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveView(m.key)}
            style={{
              display:'flex', alignItems:'center', gap:8,
              background:'transparent', border:'1px solid var(--bg4)',
              borderRadius:4, padding:'7px 10px',
              cursor:'pointer', textAlign:'left',
              transition:'border-color .12s, background .12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--c)'
              e.currentTarget.style.background  = 'rgba(0,255,179,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--bg4)'
              e.currentTarget.style.background  = 'transparent'
            }}
          >
            <span style={{ fontSize:'.8rem' }}>{m.icon}</span>
            <span style={{
              fontFamily:'Share Tech Mono', fontSize:'.56rem',
              color:'var(--txt2)', letterSpacing:'.08em',
            }}>
              {m.label.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAP SECTION  —  center column, strictly contained
══════════════════════════════════════════════════════════════════════════════ */
function MapSection() {
  const containerRef   = useRef(null)
  const mapRef         = useRef(null)
  const [cursor, setCursor] = useState(null)
  const [pins,   setPins]   = useState([])

  const handlePinDrop = useCallback((latlng) => {
    setPins(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }])
  }, [])

  const handleJump = useCallback(({ lat, lng }) => {
    if (mapRef.current) mapRef.current.flyTo([lat, lng], 10, { duration: 1.2 })
  }, [])

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      handleJump({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }, [handleJump])

  useEffect(() => {
    // Try to geolocate on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        if (mapRef.current) {
          mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 5)
        }
      }, () => {}) // silent fail
    }
  }, [])

  const polylinePositions = pins.map(p => [p.lat, p.lng])

  return (
    <div style={{
      flex: 1,
      position: 'relative',
      overflow: 'hidden',    /* ← contain map tiles inside this box */
      isolation: 'isolate',  /* ← new stacking context; Leaflet z-index is local */
    }}
      ref={containerRef}
    >
      {/* Geolocate button */}
      <button
        onClick={handleGeolocate}
        title="Snap to my location"
        style={{
          position:'absolute', top:10, right:10, zIndex:50,
          background:'rgba(3,3,10,.88)',
          border:'1px solid var(--cb)', borderRadius:5,
          color:'var(--c)', fontFamily:'Share Tech Mono', fontSize:'.7rem',
          padding:'5px 10px', cursor:'pointer', backdropFilter:'blur(8px)',
          boxShadow:'0 4px 16px rgba(0,0,0,.6)',
        }}
      >
        ◎ LOCATE ME
      </button>

      {/* Leaflet map */}
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width:'100%', height:'100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Core behaviour components */}
        <MapRef     mapRef={mapRef} />
        <SizeWatcher containerRef={containerRef} />
        <MapInteractions onMove={setCursor} onPinDrop={handlePinDrop} />

        {/* Pins */}
        {pins.map((p, i) => (
          <Marker
            key={`${p.lat}-${p.lng}-${i}`}
            position={[p.lat, p.lng]}
            icon={makePinIcon(i)}
          />
        ))}

        {/* Route polyline */}
        {pins.length >= 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#00ffb3',
              weight: 1.5,
              opacity: 0.7,
              dashArray: '5 6',
            }}
          />
        )}
      </MapContainer>

      {/* Tactical HUD overlay */}
      <CommandHUD
        cursor={cursor}
        pins={pins}
        onClear={() => setPins([])}
        onJump={handleJump}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  return (
    <div style={{
      display: 'flex',
      width:   '100%',
      height:  '100%',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <LeftPanel />
      <MapSection />
      <RightPanel />
    </div>
  )
}