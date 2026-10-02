import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { memo, useMemo, useRef } from 'react'
import { DoubleSide } from 'three'

import {
  fallingState,
  grannyPos,
  lavaBallPos,
  tornadoX,
  laserOn,
  pendulumX,
  pusherX,
  rollerPos,
  sweeperAngle,
  tideLevel,
  tileState,
  wavePos,
} from '../../shared/gameData'
import { serverTime } from '../../state/store'
import { crackSphereMaterial, crackTexture, studMaterial } from '../textures'
import { Body } from '../Chaser'

/**
 * Moving obstacles. Every hazard is a pure function of the shared server clock, so
 * all players in a lobby see the same boulder in the same place.
 */

function Spike({ h }) {
  return (
    <mesh position={[h.x, (h.y || 0) + h.h / 2, h.z]} material={studMaterial('#8a90ad')} castShadow>
      <coneGeometry args={[h.r, h.h, 12]} />
    </mesh>
  )
}

function Roller({ h }) {
  const ref = useRef()
  useFrame(() => {
    const p = rollerPos(h, serverTime())
    ref.current.position.set(p.x, p.y, p.z)
    ref.current.rotation.x = -p.spin
  })
  return (
    <mesh ref={ref} material={crackSphereMaterial(h.color, h.cell)} castShadow>
      <sphereGeometry args={[h.r, 28, 20]} />
    </mesh>
  )
}

/** Tsunami: a towering curling wall of water with a foam crest, rolling towards you. */
function Wave({ h }) {
  const ref = useRef()
  const water = useMemo(() => crackTexture('#1f7fe8', '#bfeaff', [6, 2]), [])
  useFrame(() => {
    const t = serverTime()
    const w = wavePos(h, t)
    ref.current.visible = !!w
    if (w) {
      ref.current.position.z = w.z
      water.offset.y = (t * 0.6) % 1
    }
  })
  const width = h.half * 2
  return (
    <group ref={ref}>
      {/* Back slope, main wall and the overhanging curl. */}
      <mesh position={[0, 2.5, -2.6]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[width, 5, 4]} />
        <meshStandardMaterial map={water} transparent opacity={0.8} emissive="#0b4fa8" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 3.8, 0]}>
        <boxGeometry args={[width, 7.6, 2.4]} />
        <meshStandardMaterial map={water} transparent opacity={0.88} emissive="#0b4fa8" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 7.4, 1.0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.6, 1.6, width, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial map={water} transparent opacity={0.9} emissive="#1a6fd0" emissiveIntensity={0.4} side={DoubleSide} />
      </mesh>
      {/* Foam crest and spray at the foot. */}
      <mesh position={[0, 8.9, 0.6]}>
        <boxGeometry args={[width, 0.7, 2.4]} />
        <meshStandardMaterial color="#ffffff" emissive="#d8f4ff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.5, 1.6]}>
        <boxGeometry args={[width, 1, 1.2]} />
        <meshStandardMaterial color="#e8f8ff" transparent opacity={0.85} emissive="#bfe9ff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

/** Swirling twister: stacked spinning funnels with debris whirling around it. */
function Tornado({ h }) {
  const ref = useRef()
  const spin = useRef()
  const rings = useMemo(() => Array.from({ length: 6 }, (_, i) => i), [])
  useFrame((_s, dt) => {
    ref.current.position.x = tornadoX(h, serverTime())
    spin.current.rotation.y += dt * 6
  })
  return (
    <group ref={ref} position={[h.x, 0, h.z]}>
      <group ref={spin}>
        {rings.map((i) => {
          const y = 1 + i * (h.h / 6)
          const r0 = h.r * (0.35 + i * 0.22)
          return (
            <mesh key={i} position={[Math.sin(i * 1.7) * 0.4, y, Math.cos(i * 1.3) * 0.4]}>
              <cylinderGeometry args={[r0 * 1.25, r0, h.h / 6 + 0.3, 18, 1, true]} />
              <meshStandardMaterial color="#b8c4d6" transparent opacity={0.45 - i * 0.03} side={DoubleSide} depthWrite={false} emissive="#7d8aa3" emissiveIntensity={0.25} />
            </mesh>
          )
        })}
        {rings.map((i) => (
          <mesh key={`d${i}`} position={[Math.cos(i) * (h.r + 0.6 + i * 0.3), 1.5 + i * 1.8, Math.sin(i) * (h.r + 0.6 + i * 0.3)]} rotation={[i, i * 2, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color="#8a6a4a" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Grandma in a wheelchair rolling down the hall (the rider is the chaser's grandma model). */
function Granny({ h }) {
  const ref = useRef()
  useFrame(() => {
    const g = grannyPos(h, serverTime())
    ref.current.position.set(g.x, 0, g.z)
    ref.current.rotation.y = g.yaw
  })
  return (
    <group ref={ref} scale={2.35}>
      <Body kind="grandma" />
    </group>
  )
}

/** Glowing lava ball leaping across the corridor. */
function LavaBall({ h }) {
  const ref = useRef()
  useFrame((_s, dt) => {
    const p = lavaBallPos(h, serverTime())
    ref.current.visible = !!p
    if (p) {
      ref.current.position.set(p.x, p.y, h.z)
      ref.current.rotation.z -= dt * 4 * h.dir
    }
  })
  return (
    <mesh ref={ref} material={crackSphereMaterial(h.color, h.color === '#39ff6b' ? '#0d2a14' : '#2a0d08')} castShadow>
      <sphereGeometry args={[h.r, 20, 14]} />
    </mesh>
  )
}

function Sweeper({ h }) {
  const ref = useRef()
  useFrame(() => {
    ref.current.rotation.y = -sweeperAngle(h, serverTime())
  })
  return (
    <group ref={ref} position={[h.x, h.y, h.z]}>
      <mesh material={studMaterial(h.color, { emissive: h.color, emissiveIntensity: 0.35 })} castShadow>
        <boxGeometry args={[h.len * 2, 0.6, 0.6]} />
      </mesh>
    </group>
  )
}

function Pusher({ h }) {
  const ref = useRef()
  useFrame(() => {
    ref.current.position.x = pusherX(h, serverTime())
  })
  return (
    <mesh ref={ref} position={[h.x, h.h / 2, h.z]} material={studMaterial(h.color)} castShadow>
      <boxGeometry args={[h.w, h.h, h.d]} />
    </mesh>
  )
}

function Falling({ h }) {
  const block = useRef()
  const warn = useRef()
  useFrame(() => {
    const s = fallingState(h, serverTime())
    block.current.position.y = s.y
    warn.current.visible = s.warn
    warn.current.material.opacity = 0.35 + Math.sin(performance.now() / 70) * 0.2
  })
  return (
    <group position={[h.x, 0, h.z]}>
      <mesh ref={block} material={studMaterial(h.color)} castShadow>
        <boxGeometry args={[h.size, h.size, h.size]} />
      </mesh>
      <mesh ref={warn} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[h.size, h.size]} />
        <meshBasicMaterial color="#ff2020" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Pendulum({ h }) {
  const ref = useRef()
  useFrame(() => {
    ref.current.position.x = pendulumX(h, serverTime())
  })
  return (
    <group>
      <mesh position={[0, 9, h.z]} material={studMaterial('#6b4423')}>
        <boxGeometry args={[h.amp * 2 + 6, 0.8, 0.8]} />
      </mesh>
      <group ref={ref} position={[0, 0, h.z]}>
        <mesh position={[0, 5.4, 0]}>
          <boxGeometry args={[0.15, 7, 0.15]} />
          <meshStandardMaterial color="#c9a26b" />
        </mesh>
        <mesh position={[0, h.h / 2 + 0.3, 0]} material={studMaterial(h.color)} castShadow>
          <boxGeometry args={[h.w, h.h, h.d]} />
        </mesh>
      </group>
    </group>
  )
}

function Laser({ h }) {
  const beam = useRef()
  useFrame(() => {
    const on = laserOn(h, serverTime())
    beam.current.visible = on
  })
  return (
    <group position={[0, h.y, h.z]}>
      <mesh ref={beam} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, h.half * 2, 8]} />
        <meshBasicMaterial color={h.color} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (h.half - 0.3), 0, 0]} material={studMaterial('#2b2f3d')}>
          <boxGeometry args={[0.6, 0.8, 0.8]} />
        </mesh>
      ))}
    </group>
  )
}

/** Bridge tile: collider switches off while it has dropped away. */
function Tile({ h }) {
  const body = useRef()
  const mesh = useRef()
  const last = useRef(null)
  useFrame(() => {
    const s = tileState(h, serverTime())
    if (s.solid !== last.current) {
      body.current?.setEnabled(s.solid)
      last.current = s.solid
    }
    mesh.current.visible = s.solid
    const shake = s.warn ? Math.sin(performance.now() / 28) * 0.1 : 0
    mesh.current.position.set(shake, s.warn ? -0.08 : 0, 0)
    mesh.current.material.emissiveIntensity = s.warn ? 0.7 : 0
  })
  return (
    <RigidBody ref={body} type="fixed" colliders={false} position={[h.x, h.y, h.z]}>
      <CuboidCollider args={[h.w / 2, h.h / 2, h.d / 2]} />
      <mesh ref={mesh} castShadow receiveShadow>
        <boxGeometry args={[h.w, h.h, h.d]} />
        <meshStandardMaterial color={h.color} emissive="#ff3b1a" emissiveIntensity={0} roughness={0.8} />
      </mesh>
    </RigidBody>
  )
}

/** Lava that floods a walkway in waves: glows first, then rises. */
function Tide({ h }) {
  const lava = useRef()
  const warn = useRef()
  useFrame(() => {
    const s = tideLevel(h, serverTime())
    lava.current.visible = s.level > -0.9
    lava.current.position.y = s.level - 1.1
    warn.current.visible = s.warn
    warn.current.material.opacity = 0.35 + Math.sin(performance.now() / 60) * 0.25
  })
  return (
    <group position={[h.x, 0, h.z]}>
      <mesh ref={lava}>
        <boxGeometry args={[h.w, 2.2, h.d]} />
        <meshStandardMaterial color={h.color} emissive={h.color} emissiveIntensity={0.9} />
      </mesh>
      <mesh ref={warn} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[h.w, h.d]} />
        <meshBasicMaterial color="#ff5a1a" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

const COMPONENTS = {
  tile: Tile,
  tide: Tide,
  spike: Spike,
  roller: Roller,
  boulder: Roller,
  granny: Granny,
  wave: Wave,
  sweeper: Sweeper,
  pusher: Pusher,
  falling: Falling,
  pendulum: Pendulum,
  laser: Laser,
  tornado: Tornado,
  lavaBall: LavaBall,
}

export const Hazards = memo(function Hazards({ hazards }) {
  return hazards.map((h, i) => {
    const C = COMPONENTS[h.type]
    return C ? <C key={i} h={h} /> : null
  })
})

export default Hazards
