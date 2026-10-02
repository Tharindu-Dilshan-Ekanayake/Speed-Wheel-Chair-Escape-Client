import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, DoubleSide } from 'three'

import { runtime } from '../../state/store'
import Aura from './Aura'

const DURATION = 1.8

/**
 * Golden glow burst when a player levels up / rebirths: an expanding ring on the
 * ground, a column of light and a fountain of sparkles. Keyed by `fxKey` in
 * runtime.flashes ('me' for the local player, otherwise the session id).
 */
export function LevelUpFx({ fxKey }) {
  const group = useRef()
  const ring = useRef()
  const column = useRef()

  useFrame(() => {
    const at = runtime.flashes.get(fxKey)
    const age = at ? (performance.now() - at) / 1000 : 99
    const on = age < DURATION
    group.current.visible = on
    if (!on) return
    const k = age / DURATION
    const s = 0.6 + k * 4
    ring.current.scale.set(s, s, s)
    ring.current.material.opacity = 1 - k
    column.current.material.opacity = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.6
    column.current.scale.set(1 + k * 0.4, 1, 1 + k * 0.4)
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={ring} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 40]} />
        <meshBasicMaterial color="#ffe14d" transparent blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={column} position={[0, 4, 0]}>
        <cylinderGeometry args={[1.1, 1.3, 8, 24, 1, true]} />
        <meshBasicMaterial color="#fff3a0" transparent blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <Aura colors={['#ffe14d', '#ffffff', '#7dff3a']} count={40} radius={1.4} height={5} size={0.5} speed={2.2} />
    </group>
  )
}

export default LevelUpFx
