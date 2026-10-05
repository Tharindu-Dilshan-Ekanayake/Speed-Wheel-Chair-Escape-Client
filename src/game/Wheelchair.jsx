import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color } from 'three'

import { CHAIRS, chairById } from '../shared/gameData'

/**
 * Procedural wheelchair, built from simple shapes so it matches the blocky world.
 * Faces +z. Seat top sits at y = SEAT_Y.
 *
 * `motion.current.wheel` (radians) spins the big wheels; the parent advances it from
 * the real ground speed.
 */
export const SEAT_Y = 0.72
const WHEEL_R = 0.55

function Wheel({ x, color, rim, spokes = 6 }) {
  return (
    <group position={[x, WHEEL_R, -0.08]}>
      <group name="spin">
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[WHEEL_R - 0.04, 0.065, 10, 32]} />
          <meshStandardMaterial color="#182334" roughness={0.85} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[WHEEL_R - 0.085, 0.026, 8, 32]} />
          <meshStandardMaterial color={rim} metalness={0.7} roughness={0.22} emissive={color} emissiveIntensity={0.24} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[WHEEL_R - 0.13, 0.018, 6, 24]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
        </mesh>
        {Array.from({ length: spokes }, (_, i) => (
          <mesh key={i} rotation={[(i / spokes) * Math.PI, 0, 0]}>
            <boxGeometry args={[0.02, WHEEL_R * 2 - 0.12, 0.025]} />
            <meshStandardMaterial color="#d9dde6" metalness={0.5} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 10]} />
        <meshStandardMaterial color="#555b66" />
      </mesh>
    </group>
  )
}

export function Wheelchair({ chairId = 'classic', motion, ...props }) {
  const chair = chairById(chairId) || CHAIRS[0]
  const root = useRef()
  const spinners = useRef([])
  const glowMat = useRef()
  const speedRing = useRef()

  const rainbow = chair.aura === 'rainbow' || chair.id === 'glitch'
  const tmpColor = useMemo(() => new Color(), [])

  useFrame((state) => {
    if (!root.current) return
    if (!spinners.current.length) {
      root.current.traverse((o) => {
        if (o.name === 'spin') spinners.current.push(o)
      })
    }
    const angle = motion?.current?.carrying ? 0 : motion?.current?.wheel || 0
    for (const s of spinners.current) s.rotation.x = angle
    if (speedRing.current) {
      const speed = motion?.current?.speed || 0
      const active = Math.max(0, Math.min(1, (speed - 2) / 10))
      speedRing.current.material.opacity = active * (0.28 + Math.sin(state.clock.elapsedTime * 14) * 0.12)
      const pulse = 1 + Math.min(0.12, speed * 0.004) * Math.sin(state.clock.elapsedTime * 18)
      speedRing.current.scale.set(pulse, pulse, 1)
    }
    if (glowMat.current && rainbow) {
      tmpColor.setHSL((state.clock.elapsedTime * 0.25) % 1, 1, 0.55)
      glowMat.current.color.copy(tmpColor)
      glowMat.current.emissive.copy(tmpColor)
    }
  })

  const frame = chair.frame
  const seatEmissive = chair.aura ? (rainbow ? '#ffffff' : chair.color) : '#000000'

  return (
    <group ref={root} {...props}>
      <mesh ref={speedRing} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 0.92, 48]} />
        <meshBasicMaterial color={chair.aura === 'rainbow' ? '#ffffff' : chair.wheel} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* Seat + backrest */}
      <mesh position={[0, SEAT_Y - 0.05, 0.02]} castShadow>
        <boxGeometry args={[0.78, 0.1, 0.72]} />
        <meshStandardMaterial
          ref={glowMat}
          color={chair.color}
          emissive={seatEmissive}
          emissiveIntensity={chair.aura ? 0.35 : 0}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, SEAT_Y + 0.38, -0.36]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.78, 0.75, 0.07]} />
        <meshStandardMaterial color={chair.color} roughness={0.6} />
      </mesh>

      {/* Frame rails + push handles */}
      <mesh position={[0, SEAT_Y + 0.42, -0.41]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.56, 0.5, 0.05]} />
        <meshStandardMaterial color={frame} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, SEAT_Y + 0.46, -0.45]}>
        <boxGeometry args={[0.12, 0.26, 0.025]} />
        <meshStandardMaterial color={chair.wheel} emissive={chair.wheel} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
        <boxGeometry args={[0.82, 0.07, 0.58]} />
        <meshStandardMaterial color={frame} metalness={0.75} roughness={0.22} />
      </mesh>
      {[-0.41, 0.41].map((x) => (
        <group key={x}>
          <mesh position={[x, SEAT_Y + 0.25, 0.04]} castShadow>
            <boxGeometry args={[0.12, 0.08, 0.54]} />
            <meshStandardMaterial color="#243249" roughness={0.8} />
          </mesh>
          <mesh position={[x, 0.42, 0.25]}>
            <boxGeometry args={[0.025, 0.05, 0.38]} />
            <meshStandardMaterial color={chair.wheel} emissive={chair.wheel} emissiveIntensity={0.55} />
          </mesh>
          <mesh position={[x, SEAT_Y + 0.42, -0.4]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[0.05, 0.9, 0.05]} />
            <meshStandardMaterial color={frame} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[x, SEAT_Y + 0.86, -0.52]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[x, SEAT_Y + 0.2, 0.02]}>
            <boxGeometry args={[0.05, 0.05, 0.7]} />
            <meshStandardMaterial color={frame} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[x, SEAT_Y - 0.25, 0.3]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.05, 0.6, 0.05]} />
            <meshStandardMaterial color={frame} metalness={0.3} roughness={0.4} />
          </mesh>
          {/* Front caster */}
          <group position={[x * 0.8, 0.13, 0.42]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.06, 12]} />
              <meshStandardMaterial color="#2b2f38" />
            </mesh>
          </group>
        </group>
      ))}

      {/* Footrest */}
      <mesh position={[0, 0.3, 0.5]} castShadow>
        <boxGeometry args={[0.6, 0.05, 0.22]} />
        <meshStandardMaterial color={frame} />
      </mesh>

      <Wheel x={-0.5} color={chair.wheel} rim={chair.wheel} />
      <Wheel x={0.5} color={chair.wheel} rim={chair.wheel} />
    </group>
  )
}

export default Wheelchair
