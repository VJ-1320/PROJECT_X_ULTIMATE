import React from 'react'
import { useStore } from '../store/useStore'

export default function StatusBar() {
  const { statusMsg, user } = useStore()
  return (
    <div style={{
      position:'fixed',bottom:0,left:0,right:0,height:20,
      background:'var(--bg1)',borderTop:'1px solid var(--cb)',
      display:'flex',alignItems:'center',paddingLeft:14,paddingRight:14,zIndex:50,
    }}>
      <span style={{ fontFamily:'Share Tech Mono',fontSize:'.55rem',color:'var(--txt3)',letterSpacing:'.05em' }}>
        {'> '}{statusMsg}
      </span>
      <span style={{
        display:'inline-block',width:5,height:'.65em',background:'var(--c)',
        marginLeft:3,animation:'blinkDot .8s step-end infinite',verticalAlign:'middle',
      }}/>
      <div style={{ flex:1 }}/>
      {user && (
        <span style={{ fontFamily:'Share Tech Mono',fontSize:'.52rem',color:'var(--txt3)',letterSpacing:'.06em' }}>
          CLEARANCE: LVL {user.clearanceLevel} · {user.clearanceName}
        </span>
      )}
    </div>
  )
}
