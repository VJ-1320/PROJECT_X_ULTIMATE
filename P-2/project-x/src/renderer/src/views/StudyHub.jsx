/**
 * StudyHub.jsx — Project X Ultimate
 * Flagship infinite whiteboard, Huion-optimised, pressure-sensitive.
 * Engine: Canvas API + Pointer Events API, no libraries.
 */
import React, {
  useRef, useState, useEffect, useCallback, useReducer,
} from 'react'
import { useStore } from '../store/useStore'

/* ══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════════ */
const TOOL = { PEN:'pen', HIGHLIGHT:'highlight', ERASER:'eraser', TEXT:'text', RECT:'rect', CIRCLE:'circle', PAN:'pan' }
const PALETTE = ['#00ffb3','#ffffff','#f5a623','#ff4466','#5577ff','#33ff88','#bb88ff','#ff8800','#00ccff','#ffdd00']
const MIN_SCALE = 0.05
const MAX_SCALE = 8
const UNDO_LIMIT = 80
const GRID_COLOR = 'rgba(255,255,255,0.035)'
const BG_COLOR   = '#03030a'

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES
   stroke = { id, tool, color, size, opacity, points:[{x,y,pressure}], tx,ty,ts }
   text   = { id, x, y, text, color, size }
   shape  = { id, tool, x1,y1,x2,y2, color, size, opacity }
══════════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════════
   MATH HELPERS
══════════════════════════════════════════════════════════════════════════════ */
function toCanvas(clientX, clientY, rect, tf) {
  // Convert DOM client coords → canvas world coords
  return {
    x: (clientX - rect.left - tf.tx) / tf.scale,
    y: (clientY - rect.top  - tf.ty) / tf.scale,
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Catmull-Rom smoothing for pen strokes
function smooth(pts) {
  if (pts.length < 3) return pts
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    for (let t = 0; t <= 1; t += 0.2) {
      const t2 = t * t, t3 = t2 * t
      out.push({
        x: 0.5 * ((-p0.x + 3*p1.x - 3*p2.x + p3.x)*t3 + (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*t2 + (-p0.x + p2.x)*t + 2*p1.x),
        y: 0.5 * ((-p0.y + 3*p1.y - 3*p2.y + p3.y)*t3 + (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*t2 + (-p0.y + p2.y)*t + 2*p1.y),
        pressure: p1.pressure,
      })
    }
  }
  return out
}

/* ══════════════════════════════════════════════════════════════════════════════
   RENDERER  –  draws every element onto canvas
══════════════════════════════════════════════════════════════════════════════ */
function render(canvas, tf, strokes, shapes, texts, live) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height

  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, W, H)

  // Dot grid
  {
    const spacing = 28 * tf.scale
    const ox = ((tf.tx % spacing) + spacing) % spacing
    const oy = ((tf.ty % spacing) + spacing) % spacing
    ctx.fillStyle = GRID_COLOR
    for (let gx = ox; gx < W; gx += spacing) {
      for (let gy = oy; gy < H; gy += spacing) {
        ctx.beginPath()
        ctx.arc(gx, gy, clamp(tf.scale * 0.7, 0.5, 2), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.save()
  ctx.setTransform(tf.scale, 0, 0, tf.scale, tf.tx, tf.ty)

  // Committed strokes
  for (const s of strokes) _drawStroke(ctx, s)

  // Committed shapes
  for (const sh of shapes) _drawShape(ctx, sh)

  // Committed texts
  for (const t of texts) _drawText(ctx, t)

  // Live (in-progress) element
  if (live) {
    if (live.kind === 'stroke') _drawStroke(ctx, live.stroke, true)
    if (live.kind === 'shape')  _drawShape(ctx, live.shape)
  }

  ctx.restore()
}

function _drawStroke(ctx, s, isLive = false) {
  const pts = isLive ? s.points : (s.smoothed || s.points)
  if (!pts || pts.length < 2) return

  ctx.save()
  if (s.tool === TOOL.ERASER) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = s.color
  }

  if (s.tool === TOOL.HIGHLIGHT) {
    ctx.globalAlpha = 0.28
  } else {
    ctx.globalAlpha = s.opacity ?? 1
  }

  ctx.lineCap   = 'round'
  ctx.lineJoin  = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)

  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    const pressure = (s.tool === TOOL.ERASER || s.tool === TOOL.HIGHLIGHT)
      ? 1
      : clamp(p.pressure ?? 0.5, 0.05, 1)
    const w = (s.tool === TOOL.ERASER)
      ? s.size * 2.5
      : s.size * (0.4 + pressure * 0.9)

    // Draw segment with variable width (draw each span individually)
    ctx.lineWidth = w
    const prev = pts[i - 1]
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  ctx.restore()
}

function _drawShape(ctx, sh) {
  ctx.save()
  ctx.strokeStyle = sh.color
  ctx.lineWidth   = sh.size ?? 2
  ctx.globalAlpha = sh.opacity ?? 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  const x = Math.min(sh.x1, sh.x2), y = Math.min(sh.y1, sh.y2)
  const w = Math.abs(sh.x2 - sh.x1),  h = Math.abs(sh.y2 - sh.y1)

  ctx.beginPath()
  if (sh.tool === TOOL.RECT) {
    ctx.rect(x, y, w, h)
  } else {
    ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.restore()
}

function _drawText(ctx, t) {
  ctx.save()
  ctx.font      = `${t.size ?? 16}px 'Share Tech Mono', monospace`
  ctx.fillStyle = t.color ?? '#fff'
  ctx.globalAlpha = 1
  ctx.fillText(t.text, t.x, t.y)
  ctx.restore()
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATE REDUCER
══════════════════════════════════════════════════════════════════════════════ */
const initialState = {
  strokes: [],
  shapes:  [],
  texts:   [],
  history: [],   // array of snapshots for undo
  future:  [],   // for redo
}

function snap(state) {
  return {
    strokes: state.strokes.map(s => ({ ...s, points: [...s.points] })),
    shapes:  [...state.shapes],
    texts:   [...state.texts],
  }
}

function boardReducer(state, action) {
  switch (action.type) {
    case 'COMMIT_STROKE': {
      const sn = snap(state)
      return {
        ...state,
        strokes: [...state.strokes, action.stroke],
        history: [...state.history.slice(-UNDO_LIMIT), sn],
        future:  [],
      }
    }
    case 'COMMIT_SHAPE': {
      const sn = snap(state)
      return {
        ...state,
        shapes: [...state.shapes, action.shape],
        history: [...state.history.slice(-UNDO_LIMIT), sn],
        future:  [],
      }
    }
    case 'COMMIT_TEXT': {
      const sn = snap(state)
      return {
        ...state,
        texts: [...state.texts, action.text],
        history: [...state.history.slice(-UNDO_LIMIT), sn],
        future:  [],
      }
    }
    case 'UNDO': {
      if (!state.history.length) return state
      const prev = state.history[state.history.length - 1]
      return {
        strokes: prev.strokes,
        shapes:  prev.shapes,
        texts:   prev.texts,
        history: state.history.slice(0, -1),
        future:  [snap(state), ...state.future.slice(0, UNDO_LIMIT)],
      }
    }
    case 'REDO': {
      if (!state.future.length) return state
      const next = state.future[0]
      return {
        strokes: next.strokes,
        shapes:  next.shapes,
        texts:   next.texts,
        history: [...state.history.slice(-UNDO_LIMIT), snap(state)],
        future:  state.future.slice(1),
      }
    }
    case 'CLEAR': {
      const sn = snap(state)
      return {
        strokes: [], shapes: [], texts: [],
        history: [...state.history.slice(-UNDO_LIMIT), sn],
        future:  [],
      }
    }
    default: return state
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   TOOL PALETTE COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
function Toolbar({
  tool, setTool,
  color, setColor,
  size, setSize,
  opacity, setOpacity,
  onUndo, onRedo, onClear, onExport,
  canUndo, canRedo,
}) {
  const [expanded, setExpanded] = useState(true)

  const toolDefs = [
    { key: TOOL.PEN,       icon: '✏️', label: 'Pen (P)' },
    { key: TOOL.HIGHLIGHT, icon: '🖊', label: 'Highlight (H)' },
    { key: TOOL.ERASER,    icon: '⌫', label: 'Eraser (E)' },
    { key: TOOL.TEXT,      icon: 'T',  label: 'Text (T)' },
    { key: TOOL.RECT,      icon: '▭', label: 'Rectangle (R)' },
    { key: TOOL.CIRCLE,    icon: '○', label: 'Circle (C)' },
    { key: TOOL.PAN,       icon: '✋', label: 'Pan (Space/Mid)' },
  ]

  const btn = (label, onClick, disabled=false) => (
    <button key={label}
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        background:'transparent', border:'1px solid var(--bg4)',
        color: disabled ? 'var(--txt3)' : 'var(--txt2)',
        fontFamily:'Share Tech Mono', fontSize:'.58rem', letterSpacing:'.08em',
        padding:'3px 8px', borderRadius:3, cursor: disabled ? 'default' : 'pointer',
        transition:'border-color .1s, color .1s',
        opacity: disabled ? .4 : 1,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      position:'absolute', top:10, left:'50%', transform:'translateX(-50%)',
      zIndex:100,
      background:'rgba(6,6,14,0.92)',
      border:'1px solid var(--cb)',
      borderRadius:8,
      backdropFilter:'blur(12px)',
      boxShadow:'0 8px 32px rgba(0,0,0,.7)',
      display:'flex', flexDirection:'column', gap:0,
      minWidth: expanded ? 320 : 'auto',
      overflow:'hidden',
    }}>

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'5px 10px', borderBottom:'1px solid var(--bg3)',
        cursor:'pointer',
      }} onClick={() => setExpanded(e => !e)}>
        <span style={{ fontFamily:'Orbitron', fontSize:'.48rem', letterSpacing:'.2em', color:'var(--c)' }}>
          STUDY HUB
        </span>
        <span style={{ fontFamily:'Share Tech Mono', fontSize:'.55rem', color:'var(--txt3)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{ padding:10, display:'flex', flexDirection:'column', gap:10 }}>

          {/* Tool buttons */}
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {toolDefs.map(td => (
              <button
                key={td.key}
                title={td.label}
                onClick={() => setTool(td.key)}
                style={{
                  width:34, height:28,
                  background: tool === td.key ? '#00ffb322' : 'transparent',
                  border: `1px solid ${tool === td.key ? 'var(--c)' : 'var(--bg4)'}`,
                  borderRadius:4,
                  color: tool === td.key ? 'var(--c)' : 'var(--txt2)',
                  fontSize:'.8rem', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .1s',
                }}
              >
                {td.icon}
              </button>
            ))}
          </div>

          {/* Color palette */}
          <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
            {PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width:16, height:16, borderRadius:'50%',
                  background:c,
                  border: color === c ? '2px solid #fff' : '2px solid transparent',
                  cursor:'pointer', flexShrink:0,
                  boxShadow: color === c ? `0 0 6px ${c}` : 'none',
                  transition:'box-shadow .1s',
                }}
              />
            ))}
            <input
              type="color" value={color}
              onChange={e => setColor(e.target.value)}
              style={{ width:16, height:16, border:'none', borderRadius:'50%',
                background:'transparent', cursor:'pointer', padding:0 }}
              title="Custom color"
            />
          </div>

          {/* Sliders */}
          <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:'4px 8px', alignItems:'center' }}>
            <span style={{ fontFamily:'Share Tech Mono', fontSize:'.5rem', color:'var(--txt3)' }}>
              SIZE {size}px
            </span>
            <input type="range" min={1} max={60} value={size} onChange={e=>setSize(+e.target.value)}
              style={{ accentColor:'var(--c)', width:'100%' }}
            />
            <span style={{ fontFamily:'Share Tech Mono', fontSize:'.5rem', color:'var(--txt3)' }}>
              OPACITY {Math.round(opacity*100)}%
            </span>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={e=>setOpacity(+e.target.value)}
              style={{ accentColor:'var(--c)', width:'100%' }}
            />
          </div>

          {/* Action row */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {btn('↩ UNDO', onUndo, !canUndo)}
            {btn('↪ REDO', onRedo, !canRedo)}
            {btn('✕ CLEAR', onClear)}
            {btn('⤓ EXPORT', onExport)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function StudyHub() {
  /* ── Refs ── */
  const canvasRef   = useRef(null)
  const containerRef = useRef(null)
  const rafRef      = useRef(null)
  const liveRef     = useRef(null)   // live stroke/shape being drawn
  const tfRef       = useRef({ tx:0, ty:0, scale:1 })
  const panRef      = useRef(null)   // pan origin state
  const spaceRef    = useRef(false)  // spacebar held
  const textInputRef = useRef(null)

  /* ── Drawing state ── */
  const [board, dispatch] = useReducer(boardReducer, initialState)
  const [tool,    setTool]    = useState(TOOL.PEN)
  const [color,   setColor]   = useState('#00ffb3')
  const [size,    setSize]    = useState(4)
  const [opacity, setOpacity] = useState(1)
  const [tf, setTf]           = useState({ tx:0, ty:0, scale:1 })   // for re-render trigger
  const [textInput, setTextInput] = useState(null)   // { x, y, canvasX, canvasY } for text tool

  /* ── Canvas resize ── */
  useEffect(() => {
    const c = canvasRef.current
    const cont = containerRef.current
    if (!c || !cont) return
    const ro = new ResizeObserver(() => {
      c.width  = cont.clientWidth
      c.height = cont.clientHeight
      requestRedraw()
    })
    ro.observe(cont)
    c.width  = cont.clientWidth
    c.height = cont.clientHeight
    return () => ro.disconnect()
  }, [])

  /* ── Redraw loop ── */
  const requestRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      render(
        canvasRef.current,
        tfRef.current,
        board.strokes,
        board.shapes,
        board.texts,
        liveRef.current,
      )
    })
  }, [board])

  useEffect(() => { requestRedraw() }, [requestRedraw])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') { spaceRef.current = true; e.preventDefault() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type:'UNDO' }) }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); dispatch({ type:'REDO' }) }
      if (e.key === 'p') setTool(TOOL.PEN)
      if (e.key === 'h') setTool(TOOL.HIGHLIGHT)
      if (e.key === 'e') setTool(TOOL.ERASER)
      if (e.key === 't') setTool(TOOL.TEXT)
      if (e.key === 'r') setTool(TOOL.RECT)
      if (e.key === 'c') setTool(TOOL.CIRCLE)
      if (e.key === '0') { tfRef.current = { tx:0, ty:0, scale:1 }; setTf({ tx:0, ty:0, scale:1 }) }
    }
    const onKeyUp = e => { if (e.code === 'Space') spaceRef.current = false }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [])

  /* ── Coordinate helper ── */
  const getCoords = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return toCanvas(e.clientX, e.clientY, rect, tfRef.current)
  }, [])

  /* ── Wheel / zoom ── */
  const onWheel = useCallback(e => {
    e.preventDefault()
    const rect  = canvasRef.current.getBoundingClientRect()
    const mx    = e.clientX - rect.left
    const my    = e.clientY - rect.top
    const delta = e.deltaY < 0 ? 1.1 : 0.91
    const tf    = tfRef.current
    const ns    = clamp(tf.scale * delta, MIN_SCALE, MAX_SCALE)
    const ratio = ns / tf.scale
    tfRef.current = {
      scale: ns,
      tx: mx - ratio * (mx - tf.tx),
      ty: my - ratio * (my - tf.ty),
    }
    setTf({ ...tfRef.current })
    requestRedraw()
  }, [requestRedraw])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive:false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  /* ══════════════════════════════════════════════════════════════════════════
     POINTER EVENTS
  ══════════════════════════════════════════════════════════════════════════ */
  const onPointerDown = useCallback(e => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const isPan = tool === TOOL.PAN || spaceRef.current || e.button === 1

    if (isPan) {
      panRef.current = { ox: e.clientX, oy: e.clientY, tx: tfRef.current.tx, ty: tfRef.current.ty }
      return
    }

    if (tool === TOOL.TEXT) {
      const rect = canvasRef.current.getBoundingClientRect()
      const { x, y } = getCoords(e)
      setTextInput({ canvasX: x, canvasY: y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top })
      return
    }

    const isShape = tool === TOOL.RECT || tool === TOOL.CIRCLE
    const { x, y } = getCoords(e)

    if (isShape) {
      liveRef.current = { kind:'shape', shape:{ id:Date.now(), tool, x1:x, y1:y, x2:x, y2:y, color, size, opacity } }
    } else {
      liveRef.current = {
        kind:'stroke',
        stroke:{
          id: Date.now(), tool, color,
          size: tool === TOOL.HIGHLIGHT ? size * 6 : size,
          opacity,
          points:[{ x, y, pressure: e.pressure || 0.5 }],
        },
      }
    }
    requestRedraw()
  }, [tool, color, size, opacity, getCoords, requestRedraw])

  const onPointerMove = useCallback(e => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.ox
      const dy = e.clientY - panRef.current.oy
      tfRef.current = { ...tfRef.current, tx: panRef.current.tx + dx, ty: panRef.current.ty + dy }
      setTf({ ...tfRef.current })
      requestRedraw()
      return
    }

    if (!liveRef.current || e.buttons === 0) return
    const { x, y } = getCoords(e)

    if (liveRef.current.kind === 'shape') {
      liveRef.current.shape.x2 = x
      liveRef.current.shape.y2 = y
    } else {
      liveRef.current.stroke.points.push({ x, y, pressure: e.pressure || 0.5 })
    }
    requestRedraw()
  }, [getCoords, requestRedraw])

  const onPointerUp = useCallback(e => {
    panRef.current = null

    if (!liveRef.current) return
    const live = liveRef.current
    liveRef.current = null

    if (live.kind === 'shape') {
      dispatch({ type:'COMMIT_SHAPE', shape: live.shape })
    } else {
      const s = live.stroke
      // Smooth pen strokes, not eraser/highlighter
      if (s.tool === TOOL.PEN && s.points.length > 3) {
        s.smoothed = smooth(s.points)
      }
      dispatch({ type:'COMMIT_STROKE', stroke: s })
    }
  }, [])

  /* ══════════════════════════════════════════════════════════════════════════
     TEXT INPUT COMMIT
  ══════════════════════════════════════════════════════════════════════════ */
  const commitText = useCallback((val) => {
    if (!textInput || !val.trim()) { setTextInput(null); return }
    dispatch({ type:'COMMIT_TEXT', text:{
      id: Date.now(),
      x: textInput.canvasX,
      y: textInput.canvasY,
      text: val.trim(),
      color, size: size * 3.5,
    }})
    setTextInput(null)
  }, [textInput, color, size])

  /* ══════════════════════════════════════════════════════════════════════════
     EXPORT
  ══════════════════════════════════════════════════════════════════════════ */
  const handleExport = useCallback(async () => {
    const c = canvasRef.current
    if (!c) return
    try {
      const dataUrl = c.toDataURL('image/png')
      await window.px.exportCanvas(dataUrl)
    } catch {}
  }, [])

  /* ══════════════════════════════════════════════════════════════════════════
     CURSOR
  ══════════════════════════════════════════════════════════════════════════ */
  const cursorStyle = () => {
    if (tool === TOOL.PAN || spaceRef.current) return 'grab'
    if (tool === TOOL.ERASER)  return 'cell'
    if (tool === TOOL.TEXT)    return 'text'
    return 'crosshair'
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={containerRef}
      style={{
        position:'relative', width:'100%', height:'100%',
        overflow:'hidden', background:BG_COLOR,
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ display:'block', cursor: cursorStyle(), touchAction:'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Floating toolbar */}
      <Toolbar
        tool={tool}       setTool={setTool}
        color={color}     setColor={setColor}
        size={size}       setSize={setSize}
        opacity={opacity} setOpacity={setOpacity}
        onUndo={()  => dispatch({ type:'UNDO' })}
        onRedo={()  => dispatch({ type:'REDO' })}
        onClear={()  => { if (window.confirm('Clear the board?')) dispatch({ type:'CLEAR' }) }}
        onExport={handleExport}
        canUndo={board.history.length > 0}
        canRedo={board.future.length  > 0}
      />

      {/* Inline text input */}
      {textInput && (
        <div style={{
          position:'absolute',
          left: textInput.screenX, top: textInput.screenY,
          zIndex:200,
        }}>
          <input
            ref={textInputRef}
            autoFocus
            style={{
              background:'rgba(6,6,14,.85)', border:`1px solid var(--c)`,
              color: color, fontFamily:'Share Tech Mono',
              fontSize: `${size * 3.5 * tfRef.current.scale}px`,
              padding:'2px 6px', borderRadius:3, outline:'none',
              minWidth:120,
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') commitText(e.target.value)
              if (e.key === 'Escape') setTextInput(null)
            }}
            onBlur={e => commitText(e.target.value)}
          />
        </div>
      )}

      {/* HUD — zoom level + shortcut hint */}
      <div style={{
        position:'absolute', bottom:10, right:12,
        fontFamily:'Share Tech Mono', fontSize:'.5rem',
        color:'var(--txt3)', letterSpacing:'.1em',
        pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2,
      }}>
        <span>{Math.round(tf.scale * 100)}%</span>
        <span style={{ opacity:.5 }}>Scroll=zoom · Mid/Space=pan · 0=reset · Ctrl+Z=undo</span>
      </div>
    </div>
  )
}
