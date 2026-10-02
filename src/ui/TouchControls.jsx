import { useRef, useState } from 'react'

import { runtime } from '../state/store'

/** On-screen joystick + jump button for touch devices. */
export function TouchControls() {
  const [enabled] = useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))
  const knob = useRef()
  const origin = useRef(null)

  if (!enabled) return null

  const move = (e) => {
    if (!origin.current) return
    const dx = e.clientX - origin.current.x
    const dy = e.clientY - origin.current.y
    const len = Math.min(45, Math.hypot(dx, dy))
    const a = Math.atan2(dy, dx)
    const x = Math.cos(a) * len
    const y = Math.sin(a) * len
    knob.current.style.transform = `translate(${x}px, ${y}px)`
    runtime.touch.x = x / 45
    runtime.touch.y = -y / 45
  }
  const end = () => {
    origin.current = null
    knob.current.style.transform = ''
    runtime.touch.x = 0
    runtime.touch.y = 0
  }

  return (
    <div className="hud" style={{ zIndex: 12 }}>
      <div
        className="joy"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="knob" ref={knob} />
      </div>
      <button
        className="jump-btn"
        onPointerDown={() => (runtime.touch.jump = true)}
        onPointerUp={() => (runtime.touch.jump = false)}
        onPointerCancel={() => (runtime.touch.jump = false)}
      >
        ⤒
      </button>
    </div>
  )
}

export default TouchControls
