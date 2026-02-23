import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'

// ── Left Panel — Clearance + Telemetry ────────────────────────────────────────
function LeftPanel() {
  const { user } = useStore()
  const [sys, setSys] = useState(null)
  const [clock, setClock] = useState({ h:'--',m:'--',s:'--',date:'',tz:'' })

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT']
      const MON  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
      setClock({
        h:    String(n.getHours()).padStart(2,'0'),
        m:    String(n.getMinutes()).padStart(2,'0'),
        s:    String(n.getSeconds()).padStart(2,'0'),
        date: `${DAYS[n.getDay()]} ${n.getDate()} ${MON[n.getMonth()]} ${n.getFullYear()}`,
        tz:   Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    }
    tick(); const id = setInterval(tick,1000); return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const fetchSys = () => window.px.getSysinfo().then(setSys)
    fetchSys(); const id = setInterval(fetchSys,5000); return () => clearInterval(id)
  }, [])

  const LEVEL_COLOR = { 1:'#b0c0cc', 2:'#f5a623', 3:'#5577ff', 4:'#00ffb3' }
  const lc = LEVEL_COLOR[user?.clearanceLevel] || 'var(--txt3)'
  const ramPct = sys ? Math.round(((sys.memory.total-sys.memory.free)/sys.memory.total)*100) : 0
  const ramGB  = sys ? ((sys.memory.total-sys.memory.free)/1073741824).toFixed(1) : '—'
  const totGB  = sys ? (sys.memory.total/1073741824).toFixed(0) : '—'
  const upH    = sys ? Math.floor(sys.uptime/3600) : 0
  const upM    = sys ? Math.floor((sys.uptime%3600)/60) : 0

  return (
    <div style={{
      width:220,flexShrink:0,background:'var(--bg1)',borderRight:'1px solid var(--cb)',
      display:'flex',flexDirection:'column',overflow:'hidden',
    }}>
      {/* Clearance ID Card */}
      <div style={{ padding:'16px 14px',borderBottom:'1px solid var(--cb)' }}>
        <div style={{ fontFamily:'Orbitron',fontSize:'.45rem',letterSpacing:'.22em',color:'var(--txt3)',marginBottom:10,textTransform:'uppercase' }}>
          // IDENTIFICATION
        </div>
        {/* Avatar */}
        <div style={{
          width:44,height:44,borderRadius:'50%',
          background:lc,display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'Orbitron',fontSize:'1.2rem',color:'var(--bg)',
          boxShadow:`0 0 16px ${lc}44`,marginBottom:10,
        }}>
          {(user?.username||'?')[0].toUpperCase()}
        </div>
        <div style={{ fontFamily:'Orbitron',fontSize:'.72rem',fontWeight:700,color:'var(--txt)',letterSpacing:'.04em',marginBottom:4 }}>
          {user?.username?.toUpperCase() || '—'}
        </div>
        {/* Clearance badge */}
        <div style={{
          display:'inline-flex',alignItems:'center',gap:5,
          border:`1px solid ${lc}44`,borderRadius:4,padding:'3px 10px',
          fontFamily:'Share Tech Mono',fontSize:'.55rem',letterSpacing:'.1em',color:lc,
          textTransform:'uppercase',
        }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:lc,boxShadow:`0 0 5px ${lc}`,display:'inline-block' }}/>
          LVL {user?.clearanceLevel} · {user?.clearanceName}
        </div>

        {/* Digital clock */}
        <div style={{ marginTop:14 }}>
          <div style={{
            fontFamily:'Orbitron',fontSize:'1.4rem',fontWeight:900,lineHeight:1,
            background:'linear-gradient(135deg,#fff 30%,var(--c))',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          }}>
            {clock.h}:{clock.m}<span style={{ fontSize:'.8rem',opacity:.5 }}>:{clock.s}</span>
          </div>
          <div style={{ fontFamily:'Share Tech Mono',fontSize:'.57rem',color:'var(--txt2)',letterSpacing:'.1em',marginTop:4,textTransform:'uppercase' }}>
            {clock.date}
          </div>
          <div style={{ fontFamily:'Share Tech Mono',fontSize:'.52rem',color:'var(--txt3)',letterSpacing:'.06em',marginTop:2 }}>
            {clock.tz}
          </div>
        </div>
      </div>

      {/* System Telemetry */}
      <div style={{ padding:'14px 14px 10px',borderBottom:'1px solid var(--cb)' }}>
        <SectionHd>TELEMETRY</SectionHd>
        <StatBar label="RAM" value={`${ramPct}%`} pct={ramPct} color="var(--c)"/>
        <StatBar label="UP"  value={`${upH}h${upM}m`} pct={Math.min(100,Math.round((sys?.uptime||0)/86400*100))} color="var(--a)"/>

        {sys && (
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:10 }}>
            {[
              { l:'HOST', v:sys.hostname },
              { l:'USER', v:sys.user },
              { l:'RAM',  v:`${ramGB}/${totGB}G` },
              { l:'CPU',  v:`${sys.cpuCores}C·${sys.arch}` },
              { l:'OS',   v:sys.platform },
            ].map(({l,v}) => (
              <div key={l} style={{ background:'var(--bg3)',border:'1px solid var(--bg4)',borderRadius:5,padding:'6px 8px' }}>
                <div style={{ fontFamily:'Share Tech Mono',fontSize:'.48rem',letterSpacing:'.08em',textTransform:'uppercase',color:'var(--txt3)' }}>{l}</div>
                <div style={{ fontFamily:'Share Tech Mono',fontSize:'.62rem',color:'var(--txt)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modular Bay (placeholder for Phase 3 widgets) */}
      <div style={{ padding:'14px 14px',flex:1 }}>
        <SectionHd>MODULAR BAY</SectionHd>
        <div style={{
          border:'1px dashed var(--bg4)',borderRadius:8,padding:'20px 12px',
          textAlign:'center',marginTop:4,
        }}>
          <div style={{ fontFamily:'Share Tech Mono',fontSize:'.55rem',color:'var(--txt3)',letterSpacing:'.08em',textTransform:'uppercase',lineHeight:1.8 }}>
            Widgets available<br/>in Phase 3
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBar({ label, value, pct, color }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
      <span style={{ fontFamily:'Share Tech Mono',fontSize:'.52rem',letterSpacing:'.06em',textTransform:'uppercase',color:'var(--txt3)',width:36,flexShrink:0 }}>{label}</span>
      <div style={{ flex:1,height:3,background:'var(--bg3)',borderRadius:100,overflow:'hidden' }}>
        <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}66)`,borderRadius:100,boxShadow:`0 0 5px ${color}`,transition:'width .8s var(--ease)' }}/>
      </div>
      <span style={{ fontFamily:'Share Tech Mono',fontSize:'.58rem',color,width:38,textAlign:'right',flexShrink:0 }}>{value}</span>
    </div>
  )
}

function SectionHd({ children }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
      <span style={{ fontFamily:'Orbitron',fontSize:'.45rem',letterSpacing:'.22em',color:'var(--txt3)',textTransform:'uppercase' }}>{children}</span>
      <div style={{ flex:1,height:1,background:'var(--cb)',opacity:.4 }}/>
    </div>
  )
}

// ── Center — Leaflet Map ───────────────────────────────────────────────────────
function MapPanel() {
  const mapRef       = useRef(null)
  const mapInstance  = useRef(null)
  const { setStatus } = useStore()
  const [pinMode,  setPinMode]  = useState(false)
  const [distMode, setDistMode] = useState(false)
  const [distText, setDistText] = useState('')
  const [coords,   setCoords]   = useState('LAT — · LNG —')
  const [searchVal,setSearchVal]= useState('')
  const distPoints   = useRef([])
  const distMarkers  = useRef([])
  const distLine     = useRef(null)
  const mapPins      = useRef([])

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return
    import('leaflet').then(L => {
      const map = L.default.map(mapRef.current, { zoomControl:false, attributionControl:false }).setView([20,0],2)
      L.default.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
        subdomains:'abcd',maxZoom:19,
      }).addTo(map)
      L.default.control.zoom({ position:'bottomright' }).addTo(map)
      mapInstance.current = map

      map.on('mousemove', e => {
        setCoords(`LAT ${e.latlng.lat.toFixed(5)} · LNG ${e.latlng.lng.toFixed(5)}`)
      })
      map.on('click', e => {
        if (pinMode) addPin(L.default, e.latlng)
        else if (distMode) addDistPoint(L.default, e.latlng)
      })

      // Load saved pins
      window.px.readData('mapPins').then(pins => {
        if (pins) pins.forEach(p => addPinMarker(L.default, p))
      })

      // Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude:lat, longitude:lng } = pos.coords
          map.setView([lat,lng],13)
          const icon = L.default.divIcon({
            html:`<div style="width:12px;height:12px;background:var(--c);border-radius:50%;box-shadow:0 0 18px var(--c),0 0 40px var(--c);border:2px solid rgba(0,255,179,.3)"></div>`,
            iconSize:[12,12],iconAnchor:[6,6],className:'',
          })
          L.default.marker([lat,lng],{icon}).addTo(map)
            .bindPopup('<span style="font-family:Share Tech Mono;font-size:.7rem;color:var(--c)">📍 YOUR LOCATION</span>')
          setStatus('GPS ACQUIRED')
        }, () => setStatus('LOCATION UNAVAILABLE'))
      }
    })
    return () => { mapInstance.current?.remove(); mapInstance.current = null }
  }, [])

  // Re-bind click when mode changes
  useEffect(() => {
    const map = mapInstance.current; if (!map) return
    map.off('click')
    map.on('click', e => {
      import('leaflet').then(L => {
        if (pinMode) addPin(L.default, e.latlng)
        else if (distMode) addDistPoint(L.default, e.latlng)
      })
    })
    map.getContainer().style.cursor = (pinMode||distMode) ? 'crosshair' : ''
  }, [pinMode, distMode])

  const addPinMarker = (L, pin) => {
    const map = mapInstance.current; if (!map) return
    const icon = L.divIcon({ html:`<div style="width:10px;height:10px;background:var(--r);border-radius:50%;box-shadow:0 0 10px var(--r)"></div>`,iconSize:[10,10],iconAnchor:[5,5],className:'' })
    L.marker([pin.lat,pin.lng],{icon}).addTo(map)
     .bindPopup(`<span style="color:var(--r)">📍 ${pin.name}</span>`)
  }

  const addPin = (L, latlng) => {
    const name = prompt('Pin label (optional):') || `Pin ${mapPins.current.length+1}`
    const pin  = { id:'p_'+Date.now(), lat:latlng.lat, lng:latlng.lng, name }
    mapPins.current.push(pin)
    window.px.writeData('mapPins', mapPins.current)
    addPinMarker(L, pin)
    setStatus(`PIN DROPPED: ${name.toUpperCase()}`)
  }

  const addDistPoint = (L, latlng) => {
    const map = mapInstance.current; if (!map) return
    if (distPoints.current.length >= 2) {
      distPoints.current = []
      distMarkers.current.forEach(m => map.removeLayer(m)); distMarkers.current = []
      if (distLine.current) { map.removeLayer(distLine.current); distLine.current = null }
      setDistText('')
    }
    distPoints.current.push(latlng)
    const icon = L.divIcon({ html:`<div style="width:9px;height:9px;background:var(--a);border-radius:50%;box-shadow:0 0 10px var(--a)"></div>`,iconSize:[9,9],iconAnchor:[4,4],className:'' })
    distMarkers.current.push(L.marker([latlng.lat,latlng.lng],{icon}).addTo(map))
    if (distPoints.current.length === 2) {
      distLine.current = L.polyline(distPoints.current,{color:'#f5a623',weight:2,dashArray:'6,4'}).addTo(map)
      const km = map.distance(distPoints.current[0],distPoints.current[1])/1000
      const mi = (km*0.621371).toFixed(2)
      setDistText(`${km.toFixed(2)} km · ${mi} mi`)
      setStatus(`DISTANCE: ${km.toFixed(2)} KM`)
    }
  }

  const doSearch = async () => {
    if (!searchVal.trim()) return
    setStatus(`SEARCHING: ${searchVal.toUpperCase()}`)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchVal)}&format=json&limit=1`)
      const data = await res.json()
      if (data?.length) {
        const { lat, lon, display_name } = data[0]
        import('leaflet').then(L => {
          mapInstance.current?.setView([parseFloat(lat),parseFloat(lon)],13)
          const icon = L.default.divIcon({ html:`<div style="width:10px;height:10px;background:var(--a);border-radius:50%;box-shadow:0 0 12px var(--a)"></div>`,iconSize:[10,10],iconAnchor:[5,5],className:'' })
          L.default.marker([lat,lon],{icon}).addTo(mapInstance.current)
           .bindPopup(`<span style="color:var(--a)">${display_name.split(',').slice(0,2).join(', ')}</span>`).openPopup()
        })
        setStatus(`LOCATED: ${display_name.split(',')[0].toUpperCase()}`)
      } else setStatus('LOCATION NOT FOUND')
    } catch { setStatus('SEARCH FAILED — CHECK INTERNET') }
  }

  return (
    <div style={{ flex:1,position:'relative',minWidth:0 }}>
      <div ref={mapRef} style={{ width:'100%',height:'100%' }}/>

      {/* Search overlay */}
      <div style={{ position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',zIndex:500,display:'flex',gap:6 }}>
        <input value={searchVal} onChange={e=>setSearchVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
          placeholder="Search location..."
          style={{
            width:240,background:'rgba(3,3,10,.9)',border:'1px solid var(--cb)',
            borderRadius:6,color:'var(--c)',fontFamily:'Share Tech Mono',
            fontSize:'.72rem',padding:'7px 14px',outline:'none',
            backdropFilter:'blur(10px)',
          }}/>
        <MapBtn onClick={doSearch}>SEARCH</MapBtn>
        <MapBtn onClick={()=>setPinMode(p=>!p)} active={pinMode}>📍 PIN</MapBtn>
        <MapBtn onClick={()=>{setDistMode(d=>!d);setDistText('')}} active={distMode}>📏 DIST</MapBtn>
      </div>

      {/* Coords */}
      <div style={{
        position:'absolute',bottom:24,left:14,zIndex:500,
        background:'rgba(3,3,10,.82)',border:'1px solid var(--cb)',borderRadius:4,
        padding:'4px 12px',fontFamily:'Share Tech Mono',fontSize:'.58rem',color:'var(--c)',letterSpacing:'.07em',
        pointerEvents:'none',
      }}>
        {coords}
      </div>

      {/* Distance info */}
      {distText && (
        <div style={{
          position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:500,
          background:'rgba(3,3,10,.9)',border:'1px solid var(--ab)',borderRadius:6,
          padding:'7px 16px',fontFamily:'Share Tech Mono',fontSize:'.66rem',color:'var(--a)',
          display:'flex',alignItems:'center',gap:12,
        }}>
          <span>{distText}</span>
          <button onClick={()=>{setDistText('');distPoints.current=[];distMarkers.current.forEach(m=>mapInstance.current?.removeLayer(m));distMarkers.current=[];if(distLine.current){mapInstance.current?.removeLayer(distLine.current);distLine.current=null}}}
            style={{ background:'none',border:'1px solid var(--ab)',borderRadius:4,color:'var(--a)',fontFamily:'Share Tech Mono',fontSize:'.55rem',padding:'2px 8px',cursor:'pointer' }}>
            RESET
          </button>
        </div>
      )}
    </div>
  )
}

function MapBtn({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--a)' : 'rgba(0,255,179,.08)',
      border:`1px solid ${active?'var(--ab)':'var(--cb)'}`,
      borderRadius:6,color:active?'var(--bg)':'var(--c)',
      fontFamily:'Share Tech Mono',fontSize:'.58rem',letterSpacing:'.07em',
      textTransform:'uppercase',padding:'7px 12px',cursor:'pointer',
      backdropFilter:'blur(8px)',transition:'all var(--t)',whiteSpace:'nowrap',
    }}>
      {children}
    </button>
  )
}

// ── Right Panel — Command Deck ────────────────────────────────────────────────
function RightPanel() {
  return (
    <div style={{
      width:220,flexShrink:0,background:'var(--bg1)',borderLeft:'1px solid var(--cb)',
      display:'flex',flexDirection:'column',overflow:'hidden',
    }}>
      <div style={{ padding:'14px 14px',borderBottom:'1px solid var(--cb)' }}>
        <SectionHd>COMMAND DECK</SectionHd>
        <div style={{
          border:'1px dashed var(--bg4)',borderRadius:8,padding:'20px 12px',
          textAlign:'center',
        }}>
          <div style={{ fontFamily:'Share Tech Mono',fontSize:'.55rem',color:'var(--txt3)',letterSpacing:'.08em',textTransform:'uppercase',lineHeight:1.8 }}>
            Tactical widgets<br/>+ App launcher<br/>Phase 3
          </div>
        </div>
      </div>

      {/* Quick links to modules */}
      <div style={{ padding:'14px' }}>
        <SectionHd>QUICK ACCESS</SectionHd>
        {[
          { v:'study',   icon:'✏️',  label:'Open Study Hub' },
          { v:'apps',    icon:'🚀', label:'App Launcher' },
          { v:'todos',   icon:'✅', label:'Task Manager' },
        ].map(({v,icon,label}) => (
          <QuickBtn key={v} icon={icon} label={label} viewId={v}/>
        ))}
      </div>
    </div>
  )
}

function QuickBtn({ icon, label, viewId }) {
  const { setView } = useStore()
  return (
    <button onClick={() => setView(viewId)} style={{
      width:'100%',display:'flex',alignItems:'center',gap:8,
      background:'var(--bg3)',border:'1px solid var(--bg4)',borderRadius:6,
      color:'var(--txt2)',fontFamily:'Share Tech Mono',fontSize:'.62rem',
      letterSpacing:'.05em',padding:'8px 10px',cursor:'pointer',
      transition:'all var(--t)',marginBottom:6,
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--cb)';e.currentTarget.style.color='var(--c)'}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bg4)';e.currentTarget.style.color='var(--txt2)'}}
    >
      <span style={{ fontSize:'.85rem' }}>{icon}</span>
      {label}
    </button>
  )
}

// ── Dashboard view (3-column) ─────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div style={{ display:'flex',width:'100%',height:'100%' }}>
      <LeftPanel  />
      <MapPanel   />
      <RightPanel />
    </div>
  )
}
