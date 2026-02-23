import React, { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

/* ── Clearance color map ─────────────────────────────────────────────────────── */
const CL_COLOR = { 1:'#8899aa', 2:'#f5a623', 3:'#5577ff', 4:'#00ffb3' }
const CL_LABEL = { 1:'UNCLASSIFIED', 2:'RESTRICTED', 3:'CLASSIFIED', 4:'DIRECTOR' }

/* ── Window control button ───────────────────────────────────────────────────── */
function WinBtn({ color, label, glyph, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        WebkitAppRegion: 'no-drag',
        width: 32, height: '100%',
        border: 'none', outline: 'none',
        background: hover ? `${color}1a` : 'transparent',
        color: hover ? color : 'var(--txt3)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.68rem',
        fontFamily: 'Share Tech Mono',
        transition: 'color .1s, background .1s',
        borderLeft: '1px solid var(--bg3)',
      }}
    >
      {glyph}
    </button>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export default function TitleBar() {
  const { user, activeView } = useStore()
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const tick = () => {
      const n   = new Date()
      const pad = v => String(v).padStart(2, '0')
      setTime(`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`)
      setDate(n.toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' }).toUpperCase())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const clColor = user ? CL_COLOR[user.clearanceLevel] ?? '#444' : '#444'
  const clLabel = user ? CL_LABEL[user.clearanceLevel] ?? '' : ''

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, height:32,
      zIndex:2000,
      display:'flex', alignItems:'stretch',
      background:'var(--bg1)',
      borderBottom:'1px solid var(--cb)',
      WebkitAppRegion:'drag',
      userSelect:'none',
    }}>

      {/* Logo */}
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'0 14px',
        borderRight:'1px solid var(--bg3)', flexShrink:0,
      }}>
        <span style={{
          fontFamily:'Orbitron', fontSize:'.52rem',
          letterSpacing:'.3em', color:'var(--c)', textTransform:'uppercase',
        }}>
          ⬡ PROJECT X
        </span>
        <span style={{
          width:5, height:5, borderRadius:'50%',
          background:'var(--c)', boxShadow:'0 0 7px var(--c)',
          display:'inline-block', flexShrink:0,
          animation:'blinkDot 1.4s ease-in-out infinite',
        }}/>
      </div>

      {/* Breadcrumb */}
      <div style={{
        display:'flex', alignItems:'center', padding:'0 14px',
        borderRight:'1px solid var(--bg3)', flexShrink:0,
      }}>
        <span style={{
          fontFamily:'Share Tech Mono', fontSize:'.52rem',
          letterSpacing:'.14em', color:'var(--txt3)', textTransform:'uppercase',
        }}>
          {(activeView || 'DASHBOARD').replace(/-/g,' ')}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex:1 }} />

      {/* Clearance badge */}
      {user && (
        <div style={{
          display:'flex', alignItems:'center', gap:7, padding:'0 14px',
          borderLeft:'1px solid var(--bg3)', flexShrink:0,
        }}>
          <span style={{
            width:6, height:6, borderRadius:'50%',
            background:clColor, boxShadow:`0 0 8px ${clColor}`, flexShrink:0,
          }}/>
          <span style={{
            fontFamily:'Share Tech Mono', fontSize:'.52rem',
            letterSpacing:'.12em', color:clColor, textTransform:'uppercase',
          }}>
            {clLabel}
          </span>
        </div>
      )}

      {/* User ID */}
      {user && (
        <div style={{
          display:'flex', alignItems:'center', padding:'0 12px',
          borderLeft:'1px solid var(--bg3)', flexShrink:0,
        }}>
          <span style={{
            fontFamily:'Share Tech Mono', fontSize:'.54rem',
            letterSpacing:'.08em', color:'var(--txt2)',
          }}>
            {user.username.toUpperCase()}
          </span>
        </div>
      )}

      {/* Clock */}
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'flex-end',
        justifyContent:'center', padding:'0 12px',
        borderLeft:'1px solid var(--bg3)', flexShrink:0, gap:1,
      }}>
        <span style={{ fontFamily:'Share Tech Mono', fontSize:'.65rem', color:'var(--txt1)', letterSpacing:'.06em', lineHeight:1 }}>
          {time}
        </span>
        <span style={{ fontFamily:'Share Tech Mono', fontSize:'.44rem', color:'var(--txt3)', letterSpacing:'.1em', lineHeight:1 }}>
          {date}
        </span>
      </div>

      {/* Window controls */}
      <div style={{ display:'flex', alignItems:'stretch', borderLeft:'1px solid var(--bg3)', WebkitAppRegion:'no-drag' }}>
        <WinBtn glyph="─" label="Minimize" color="var(--a)" onClick={() => window.px.minimize()} />
        <WinBtn glyph="□" label="Maximize" color="var(--g)" onClick={() => window.px.maximize()} />
        <WinBtn glyph="✕" label="Close"    color="var(--r)" onClick={() => window.px.close()}    />
      </div>
    </div>
  )
}
