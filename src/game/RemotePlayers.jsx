import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'

import { runtime, useGame } from '../state/store'
import Trail from './effects/Trail'
import PetFollowers from './Pets'
import Rider from './Rider'

const VISIBLE_RANGE = 140

/** Another player: smoothed toward the latest server snapshot. */
const RemotePlayer = memo(function RemotePlayer({ data }) {
  const group = useRef()
  const visual = useRef()
  const wheelAnchor = useRef()
  const movingRef = useRef(false)
  const motionRef = useRef({ time: 0, push: 0, phase: 0, grounded: true, wheel: 0 })
  const shown = useRef({ x: 0, y: 0, z: 0, yaw: 0, init: false })

  useFrame((_s, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = runtime.remote.get(data.sid)
    if (!t || !group.current) return
    const p = shown.current
    if (!p.init || Math.hypot(t.tx - p.x, t.tz - p.z) > 30) {
      Object.assign(p, { x: t.tx, y: t.ty, z: t.tz, yaw: t.tyaw, init: true })
    }
    const a = 1 - Math.exp(-dt * 12)
    const px = p.x
    const pz = p.z
    p.x += (t.tx - p.x) * a
    p.y += (t.ty - p.y) * a
    p.z += (t.tz - p.z) * a
    let dy = t.tyaw - p.yaw
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    p.yaw += dy * a
    // Expose the smoothed transform for pets.
    t.x = p.x
    t.y = p.y
    t.z = p.z
    t.yaw = p.yaw

    const near = Math.hypot(p.x - runtime.me.x, p.z - runtime.me.z) < VISIBLE_RANGE
    group.current.visible = near
    group.current.position.set(p.x, p.y - 1.0, p.z)
    visual.current.rotation.y = p.yaw

    const moved = Math.hypot(p.x - px, p.z - pz) / Math.max(dt, 1e-3)
    const flags = t.flags || 0
    const onTread = (flags & 4) !== 0
    const m = motionRef.current
    const effective = onTread && moved < 0.5 ? 5 : moved
    m.time += dt
    m.push = Math.min(1, effective / 5)
    m.phase += dt * (2.5 + effective * 0.55)
    m.grounded = (flags & 2) !== 0 || Math.abs(t.ty - p.y) < 0.05
    m.carrying = (flags & 8) !== 0
    m.speed = moved
    m.wheel += effective * dt / 0.55
    movingRef.current = moved > 0.5 || onTread
  })

  return (
    <>
      <group ref={group}>
        <group ref={visual}>
          <Rider
            remote
            name={data.name}
            level={data.level}
            chairId={data.chair || 'classic'}
            auraId={data.aura}
            equipped={data.avatar}
            proportions={data.proportions}
            motionRef={motionRef}
            fxKey={data.sid}
          />
          <group ref={wheelAnchor} position={[0, 0, -0.5]} />
        </group>
      </group>
      <Trail key={data.trail} trailId={data.trail} targetRef={wheelAnchor} movingRef={movingRef} />
      <RemotePets sid={data.sid} pets={data.pets} />
    </>
  )
})

function RemotePets({ sid, pets }) {
  const key = (pets || []).join(',')
  const list = useMemo(() => (key ? key.split(',') : []), [key])
  return <PetFollowers key={key} pets={list} getAnchor={() => runtime.remote.get(sid)} />
}

export function RemotePlayers() {
  const players = useGame((s) => s.players)
  return Object.values(players).map((p) => <RemotePlayer key={p.sid} data={p} />)
}

export default RemotePlayers
