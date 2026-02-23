import React from 'react'
import { useStore } from '../store/useStore'

const NAV_ITEMS = [
  { id:'dashboard', icon:'🌐', label:'Dashboard',   section:null },
  { id:'study',     icon:'✏️',  label:'Study Hub',   section:'CORE', flagship:true },
  { id:'apps',      icon:'🚀', label:'App Launcher', section:'TOOLS' },
  { id:'music',     icon:'🎵', label:'Music',        section:null },
  { id:'journal',   icon:'📔', label:'Journal',      section:'PERSONAL' },
  { id:'todos',     icon:'✅', label:'Tasks',        section:null },
  { id:'notes',     icon:'📝', label:'Notes',        section:null },
  { id:'settings',  icon:'⚙️',  label:'Settings',     section:'SYSTEM' },
]

export default function Sidebar() {
  const { activeView, setView, settings, setSettings } = useStore()
  const expanded = settings.sidebarExpanded

  const toggle = () => {
    const next = !expanded
    setSettings({ sidebarExpanded: next })
    window.px.setSettings({ sidebarExpanded: next })
  }

  return (
    <nav style={{
      position:'fixed',top:32,left:0,bottom:20,
      width: expanded ? 200 : 54,
      background:'var(--bg1)',
      borderRight:'1px solid var(--cb)',
      display:'flex',flexDirection:'column',
      alignItems:'center',
      padding:'14px 0 16px',
      zIndex:100,
      transition:'width .3s var(--ease)',
      overflow:'hidden',
    }}>
      {NAV_ITEMS.map((item, idx) => {
        const showSection = item.section && (
          idx === 0 || NAV_ITEMS[idx-1].section !== item.section
        )
        return (
          <React.Fragment key={item.id}>
            {showSection && expanded && (
              <div style={{
                fontFamily:'Share Tech Mono',fontSize:'.5rem',letterSpacing:'.18em',
                textTransform:'uppercase',color:'var(--txt3)',
                width:'100%',padding:'8px 14px 4px',whiteSpace:'nowrap',
              }}>
                {item.section}
              </div>
            )}
            <div style={{ position:'relative',width:'100%',display:'flex',justifyContent:expanded?'flex-start':'center' }}>
              <button
                onClick={() => setView(item.id)}
                title={!expanded ? item.label : undefined}
                style={{
                  width: expanded ? 'calc(100% - 16px)' : 38,
                  height: 38,
                  margin: expanded ? '2px 8px' : '2px 8px',
                  borderRadius: expanded ? 8 : '50%',
                  display:'flex',alignItems:'center',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  paddingLeft: expanded ? 12 : 0,
                  gap: 10,
                  cursor:'pointer',border:'none',
                  background: activeView===item.id ? 'rgba(0,255,179,.12)' : 'transparent',
                  borderWidth:1,borderStyle:'solid',
                  borderColor: activeView===item.id ? 'var(--cb)' : 'transparent',
                  transition:'all .22s var(--ease)',
                  position:'relative',
                }}
                onMouseEnter={e => {
                  if (activeView !== item.id) {
                    e.currentTarget.style.background='var(--bg3)'
                    e.currentTarget.style.borderColor='var(--cb)'
                  }
                }}
                onMouseLeave={e => {
                  if (activeView !== item.id) {
                    e.currentTarget.style.background='transparent'
                    e.currentTarget.style.borderColor='transparent'
                  }
                }}
              >
                {/* Active indicator */}
                {activeView===item.id && (
                  <div style={{
                    position:'absolute',left:expanded?-9:0,top:'20%',height:'60%',width:2,
                    background:'var(--c)',borderRadius:'0 2px 2px 0',
                    boxShadow:'0 0 8px var(--c)',
                  }}/>
                )}

                <span style={{
                  fontSize:'1rem',flexShrink:0,
                  filter: activeView===item.id ? 'drop-shadow(0 0 4px var(--c))' : 'none',
                  transition:'filter .2s',
                }}>
                  {item.icon}
                </span>

                {expanded && (
                  <span style={{
                    fontFamily:'Share Tech Mono',fontSize:'.68rem',letterSpacing:'.04em',
                    color: activeView===item.id ? 'var(--c)' : 'var(--txt2)',
                    whiteSpace:'nowrap',transition:'color .2s',
                  }}>
                    {item.label}
                    {item.flagship && (
                      <span style={{ marginLeft:6,fontSize:'.5rem',color:'var(--c)',opacity:.7 }}>★</span>
                    )}
                  </span>
                )}
              </button>

              {/* Tooltip (collapsed only) */}
              {!expanded && (
                <div style={{
                  position:'absolute',left:52,top:'50%',transform:'translateY(-50%)',
                  background:'var(--bg3)',border:'1px solid var(--cb)',
                  color:'var(--c)',fontFamily:'Share Tech Mono',fontSize:'.6rem',
                  letterSpacing:'.1em',textTransform:'uppercase',
                  padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',
                  pointerEvents:'none',opacity:0,zIndex:200,
                  boxShadow:'0 0 12px rgba(0,255,179,.1)',
                  transition:'all .15s',
                }} className="nav-tooltip">
                  {item.label}
                </div>
              )}
            </div>
          </React.Fragment>
        )
      })}

      <div style={{ flex:1 }}/>

      {/* Expand/collapse toggle */}
      <button onClick={toggle} style={{
        width:28,height:28,borderRadius:8,background:'none',
        border:'1px solid var(--cb)',color:'var(--txt3)',
        fontSize:'.8rem',cursor:'pointer',
        display:'flex',alignItems:'center',justifyContent:'center',
        transition:'all var(--t)',margin:'0 auto',
        transform: expanded ? 'scaleX(-1)' : 'scaleX(1)',
      }}
      onMouseEnter={e=>{e.currentTarget.style.background='var(--cg)';e.currentTarget.style.color='var(--c)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='var(--txt3)'}}
      >›</button>
    </nav>
  )
}
