import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

const CLEARANCE_BADGE = {
  1: { label:'UNCLASSIFIED',   color:'#b0c0cc' },
  2: { label:'RESTRICTED',     color:'#f5a623' },
  3: { label:'CLASSIFIED',     color:'#5577ff' },
  4: { label:'DIRECTOR / SAP', color:'#00ffb3' },
}

function PinDots({ filled }) {
  return (
    <div className="flex gap-3 justify-center my-4">
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          width:14,height:14,borderRadius:'50%',
          border:`2px solid ${i < filled ? 'var(--c)' : 'var(--txt3)'}`,
          background: i < filled ? 'var(--c)' : 'transparent',
          boxShadow: i < filled ? '0 0 8px var(--c)' : 'none',
          transition:'all .2s',
        }}/>
      ))}
    </div>
  )
}

function PinKeypad({ onKey }) {
  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']
  return (
    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,maxWidth:200,margin:'0 auto' }}>
      {keys.map(k => (
        <button key={k} onClick={() => onKey(k)} style={{
          background:'var(--bg3)',border:'1px solid var(--bg4)',borderRadius:8,
          color:'var(--txt)',fontFamily:'Share Tech Mono',fontSize:'1rem',
          padding:'12px',cursor:'pointer',transition:'all .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background='var(--bg4)'}
        onMouseLeave={e => e.currentTarget.style.background='var(--bg3)'}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

export default function AuthScreen() {
  const { setUser, setStatus } = useStore()
  const [mode, setMode]         = useState('login')   // 'login' | 'register'
  const [loginTab, setLoginTab] = useState('password') // 'password' | 'pin'
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [regPass,  setRegPass]  = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [pin,      setPin]      = useState([])
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [hasBio,   setHasBio]   = useState(false)
  const [isFirstUser, setIsFirstUser] = useState(false)
  const passRef = useRef(null)

  useEffect(() => {
    window.px.getBiometricEnabled().then(setHasBio)
    window.px.hasAccount().then(has => {
      setIsFirstUser(!has)
      if (!has) setMode('register')
    })
    setTimeout(() => passRef.current?.focus(), 300)
  }, [])

  const showErr = (msg) => { setError(msg); setTimeout(() => setError(''), 3500) }

  const enterApp = (user) => {
    setUser(user)
    setStatus(`WELCOME, ${user.username.toUpperCase()} — CLEARANCE ${user.clearanceName}`)
  }

  const doLogin = async () => {
    if (!password) return showErr('Enter your password')
    setLoading(true)
    const res = await window.px.loginPassword({ password })
    setLoading(false)
    if (res.success) enterApp(res)
    else showErr(res.error || 'Authentication failed')
  }

  const doRegister = async () => {
    if (!username.trim()) return showErr('Choose a username')
    if (regPass.length < 6) return showErr('Password must be at least 6 characters')
    if (regPass !== regPass2) return showErr('Passwords do not match')
    setLoading(true)
    const res = await window.px.register({ username: username.trim(), password: regPass })
    setLoading(false)
    if (res.success) enterApp(res)
    else showErr(res.error || 'Registration failed')
  }

  const handlePin = (k) => {
    if (k === '⌫') { setPin(p => p.slice(0,-1)); return }
    if (k === '✓') { if (pin.length === 4) submitPin(); return }
    if (pin.length >= 4) return
    const next = [...pin, k]
    setPin(next)
    if (next.length === 4) setTimeout(() => submitPin(next), 80)
  }

  const submitPin = async (digits = pin) => {
    setLoading(true)
    const res = await window.px.loginPin({ pin: digits.join('') })
    setLoading(false)
    if (res.success) { setPin([]); enterApp(res) }
    else { showErr(res.error || 'Incorrect PIN'); setPin([]) }
  }

  const doBio = async () => {
    try {
      const credId = await window.px.getBiometricCred()
      if (!credId) return showErr('No biometric credential registered')
      const arr = Uint8Array.from(atob(credId), c => c.charCodeAt(0))
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge:        new Uint8Array(32).map(() => Math.random()*256),
          allowCredentials: [{ type:'public-key', id:arr }],
          userVerification: 'required',
          timeout:          60000,
        }
      })
      if (assertion) {
        const profile = await window.px.getProfile()
        if (profile) enterApp({ ...profile, success:true })
      }
    } catch (e) { showErr('Biometric failed: ' + e.message) }
  }

  return (
    <div style={{
      position:'fixed',inset:0,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      background:'var(--bg)',zIndex:500,
    }}>
      {/* Animated rings */}
      <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
        {[300,480,680].map((size,i) => (
          <div key={i} style={{
            position:'absolute',
            width:size,height:size,borderRadius:'50%',
            border:'1px solid var(--cb)',
            opacity:1 - i * 0.3,
            animation:`spinRing ${20 + i*15}s linear infinite ${i%2?'reverse':''}`,
          }}/>
        ))}
        <div style={{
          position:'absolute',width:600,height:600,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,255,179,.04) 0%,transparent 70%)',
          animation:'glowPulse 4s ease-in-out infinite',
        }}/>
      </div>

      {/* Auth box */}
      <div style={{
        position:'relative',zIndex:1,
        background:'var(--bg2)',border:'1px solid var(--cb)',borderRadius:14,
        padding:'36px 40px',width:400,
        boxShadow:'0 0 60px rgba(0,255,179,.08)',
        animation:'scaleIn .4s var(--ease) both',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center',marginBottom:28 }}>
          <div style={{ fontFamily:'Orbitron',fontSize:'1.4rem',fontWeight:900,color:'var(--c)',textShadow:'0 0 30px var(--c)' }}>
            ⌘ PROJECT X
          </div>
          <div style={{ fontFamily:'Share Tech Mono',fontSize:'.58rem',color:'var(--txt3)',letterSpacing:'.2em',marginTop:4 }}>
            {isFirstUser ? 'FIRST SETUP — CREATE DIRECTOR ACCOUNT' : 'SECURE ACCESS TERMINAL'}
          </div>
          {isFirstUser && (
            <div style={{
              marginTop:8,fontFamily:'Share Tech Mono',fontSize:'.58rem',
              color:CLEARANCE_BADGE[4].color,border:`1px solid ${CLEARANCE_BADGE[4].color}44`,
              borderRadius:4,padding:'3px 10px',display:'inline-block',letterSpacing:'.1em',
            }}>
              ★ DIRECTOR / SAP CLEARANCE WILL BE GRANTED
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontFamily:'Share Tech Mono',fontSize:'.65rem',color:'var(--r)',
            background:'rgba(255,68,102,.08)',border:'1px solid rgba(255,68,102,.25)',
            borderRadius:6,padding:'8px 12px',marginBottom:12,
            animation:'fadeIn .2s',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── REGISTER ── */}
        {mode === 'register' ? (
          <div style={{ animation:'fadeIn .25s' }}>
            <Field label="COMMANDER DESIGNATION" id="reg-u">
              <input className="inp" id="reg-u" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username (min 3 chars)"/>
            </Field>
            <Field label="ACCESS KEY">
              <input className="inp" type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Password (min 6 chars)"/>
            </Field>
            <Field label="CONFIRM ACCESS KEY">
              <input className="inp" type="password" value={regPass2} onChange={e=>setRegPass2(e.target.value)} placeholder="Repeat password" onKeyDown={e=>e.key==='Enter'&&doRegister()}/>
            </Field>
            <SubmitBtn label="INITIALIZE COMMAND CENTER" loading={loading} onClick={doRegister}/>
          </div>
        ) : (
          /* ── LOGIN ── */
          <div style={{ animation:'fadeIn .25s' }}>
            {/* Tabs */}
            <div style={{ display:'flex',marginBottom:20,border:'1px solid var(--cb)',borderRadius:6,overflow:'hidden' }}>
              {['password','pin'].map(t => (
                <button key={t} onClick={() => { setLoginTab(t); setError(''); setPin([]) }}
                  style={{
                    flex:1,padding:'8px',fontFamily:'Share Tech Mono',fontSize:'.62rem',
                    letterSpacing:'.1em',textTransform:'uppercase',cursor:'pointer',border:'none',
                    background:loginTab===t?'var(--c)':'none',
                    color:loginTab===t?'var(--bg)':'var(--txt3)',
                    fontWeight:loginTab===t?700:400,transition:'all var(--t)',
                  }}
                >
                  {t === 'password' ? '🔑 PASSWORD' : '🔢 PIN'}
                </button>
              ))}
            </div>

            {loginTab === 'password' ? (
              <div style={{ animation:'fadeIn .2s' }}>
                <Field label="ACCESS KEY">
                  <input ref={passRef} className="inp" type="password" value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="Enter password..." onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
                </Field>
                <SubmitBtn label="AUTHENTICATE" loading={loading} onClick={doLogin}/>
              </div>
            ) : (
              <div style={{ animation:'fadeIn .2s' }}>
                <PinDots filled={pin.length}/>
                <PinKeypad onKey={handlePin}/>
              </div>
            )}

            {hasBio && (
              <button onClick={doBio} style={{
                width:'100%',background:'none',border:'1px solid var(--ab)',borderRadius:6,
                color:'var(--a)',fontFamily:'Share Tech Mono',fontSize:'.62rem',letterSpacing:'.08em',
                textTransform:'uppercase',padding:10,cursor:'pointer',marginTop:10,transition:'all var(--t)',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(245,166,35,.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
                👁 WINDOWS HELLO / BIOMETRIC
              </button>
            )}

            <div style={{ marginTop:14,textAlign:'center' }}>
              <button onClick={()=>{setMode('register');setError('')}}
                style={{ background:'none',border:'none',color:'var(--txt3)',fontFamily:'Share Tech Mono',fontSize:'.6rem',cursor:'pointer',letterSpacing:'.06em',textTransform:'uppercase' }}>
                CREATE NEW ACCOUNT →
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div style={{ marginTop:14,textAlign:'center' }}>
            <button onClick={()=>{setMode('login');setError('')}}
              style={{ background:'none',border:'none',color:'var(--txt3)',fontFamily:'Share Tech Mono',fontSize:'.6rem',cursor:'pointer',letterSpacing:'.06em',textTransform:'uppercase' }}>
              ← BACK TO LOGIN
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:'Share Tech Mono',fontSize:'.55rem',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--txt3)',marginBottom:5 }}>{label}</div>
      {children}
    </div>
  )
}

function SubmitBtn({ label, loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width:'100%',background:'var(--c)',border:'none',borderRadius:6,
      color:'var(--bg)',fontFamily:'Orbitron',fontSize:'.65rem',fontWeight:700,
      letterSpacing:'.15em',textTransform:'uppercase',padding:'12px',
      cursor:loading?'wait':'pointer',marginTop:6,
      transition:'all var(--t)',opacity:loading?.7:1,
    }}
    onMouseEnter={e=>!loading&&(e.currentTarget.style.boxShadow='0 0 20px var(--cglow)')}
    onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}
    >
      {loading ? '■ VERIFYING...' : label}
    </button>
  )
}
