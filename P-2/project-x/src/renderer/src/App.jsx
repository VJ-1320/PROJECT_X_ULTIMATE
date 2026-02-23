import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import TitleBar   from './components/TitleBar'
import Sidebar    from './components/Sidebar'
import StatusBar  from './components/StatusBar'
import AuthScreen from './components/AuthScreen'
import Dashboard  from './views/Dashboard'
import StudyHub   from './views/StudyHub'

/* ── Phase-3 stub ──────────────────────────────────────────────────────────── */
const Offline = ({ title, icon = '▣' }) => (
  <div style={{
    width:'100%', height:'100%',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', gap:14,
  }}>
    <div style={{ fontFamily:'Orbitron', fontSize:'2rem', color:'var(--txt3)', opacity:.15 }}>{icon}</div>
    <div style={{ fontFamily:'Orbitron', fontSize:'.65rem', letterSpacing:'.28em', color:'var(--txt3)', textTransform:'uppercase' }}>
      {title}
    </div>
    <div style={{
      fontFamily:'Share Tech Mono', fontSize:'.58rem', color:'var(--txt3)',
      opacity:.4, letterSpacing:'.1em', textTransform:'uppercase',
      border:'1px solid var(--bg4)', borderRadius:4, padding:'4px 14px',
    }}>
      MODULE OFFLINE — PHASE 3
    </div>
  </div>
)

/* ── View map — instantiated lazily on render, not at module scope ─────────── */
function ViewContent({ view }) {
  switch (view) {
    case 'dashboard': return <Dashboard />
    case 'study':     return <StudyHub />
    case 'apps':      return <Offline title="App Launcher"  icon="🚀" />
    case 'music':     return <Offline title="Music Player"  icon="🎵" />
    case 'journal':   return <Offline title="Journal"       icon="📔" />
    case 'todos':     return <Offline title="Task Manager"  icon="✅" />
    case 'notes':     return <Offline title="Notes"         icon="📝" />
    case 'settings':  return <Offline title="Settings"      icon="⚙️"  />
    default:          return <Dashboard />
  }
}

/* ── Root ──────────────────────────────────────────────────────────────────── */
export default function App() {
  const { isAuthed, activeView, settings } = useStore()

  /* Sidebar width drives the CSS-grid left column */
  const sbw = settings.sidebarExpanded ? 200 : 54

  useEffect(() => {
    if (!isAuthed) return
    window.px.serverPort().then(p => useStore.getState().setServerPort(p))
  }, [isAuthed])

  return (
    <>
      <TitleBar />

      {!isAuthed
        ? <AuthScreen />
        : (
          /*
           * ── STRICT CSS GRID SHELL ──────────────────────────────────────────
           * Three columns: nav-rail | main-content | (right column lives inside
           * Dashboard/Study when needed).
           * overflow:hidden on every cell — nothing can bleed across columns.
           * Transition is only on the grid-template-columns value so we get a
           * smooth sidebar expand/collapse without any margin hacks.
           */
          <div
            style={{
              position: 'fixed',
              top:    32,   /* titlebar height */
              left:   0,
              right:  0,
              bottom: 20,   /* statusbar height */
              display: 'grid',
              gridTemplateColumns: `${sbw}px 1fr`,
              transition: 'grid-template-columns .3s var(--ease)',
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            {/* Column 1 — nav rail (controls its own width internally) */}
            <div style={{ overflow: 'hidden', position: 'relative' }}>
              <Sidebar />
            </div>

            {/* Column 2 — active view, strictly contained */}
            <div style={{
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <ViewContent view={activeView} />
            </div>
          </div>
        )
      }

      <StatusBar />
    </>
  )
}
