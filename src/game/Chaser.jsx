import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'

import { runtime } from '../state/store'
import Wheelchair from './Wheelchair'
import { Label } from './world/Label'

const LOOKS = {
  grandma: { chair: 'neon', dress: '#b05ad6', skin: '#f2c9a0', hair: '#e8e8f0' },
  ghost: { chair: null, dress: '#f4f7ff', skin: '#f4f7ff', hair: null },
  king: { chair: 'king', dress: '#c4002f', skin: '#f2c9a0', hair: null },
}

export function Body({ kind }) {
  const L = LOOKS[kind] || LOOKS.grandma
  if (kind === 'ghost') {
    return (
      <group position={[0, 1.4, 0]}>
        <mesh>
          <sphereGeometry args={[0.9, 16, 12]} />
          <meshStandardMaterial color={L.dress} transparent opacity={0.85} emissive="#b8d4ff" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, -0.8, 0]}>
          <coneGeometry args={[0.9, 1.2, 16]} />
          <meshStandardMaterial color={L.dress} transparent opacity={0.75} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.15, 0.8]}>
            <sphereGeometry args={[0.15, 8, 6]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        ))}
      </group>
    )
  }
  return (
    <group>
      <Wheelchair chairId={L.chair} />
      <mesh position={[0, 1.15, -0.05]} castShadow>
        <boxGeometry args={[0.85, 0.85, 0.5]} />
        <meshStandardMaterial color={L.dress} />
      </mesh>
      <mesh position={[0, 0.82, 0.3]}>
        <boxGeometry args={[0.8, 0.3, 0.7]} />
        <meshStandardMaterial color={L.dress} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={L.skin} />
      </mesh>
      {L.hair && (
        <mesh position={[0, 2.25, -0.1]}>
          <sphereGeometry args={[0.36, 10, 8]} />
          <meshStandardMaterial color={L.hair} />
        </mesh>
      )}
      {kind === 'king' && (
        <mesh position={[0, 2.3, 0]}>
          <cylinderGeometry args={[0.32, 0.28, 0.35, 6]} />
          <meshStandardMaterial color="#ffd23d" emissive="#ffb300" emissiveIntensity={0.5} />
        </mesh>
      )}
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 1.92, 0.31]}>
          <boxGeometry args={[0.1, 0.06, 0.02]} />
          <meshBasicMaterial color="#c00" />
        </mesh>
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 1.2, 0.3]} rotation={[-1.1, 0, 0]}>
          <boxGeometry args={[0.24, 0.8, 0.24]} />
          <meshStandardMaterial color={L.skin} />
        </mesh>
      ))}
    </group>
  )
}

/** The NPC that chases the local player through chaser stages. */
export function Chaser() {
  const group = useRef()
  const [kind, setKind] = useState(null)
  const [line, setLine] = useState('')

  useFrame((state) => {
    const ch = runtime.chaser
    const visible = !!ch
    group.current.visible = visible
    if (!ch) return
    if (ch.kind !== kind) {
      setKind(ch.kind)
      setLine(ch.line)
    }
    group.current.position.set(ch.x, ch.kind === 'ghost' ? Math.sin(state.clock.elapsedTime * 3) * 0.2 : 0, ch.z)
    group.current.rotation.y = ch.yaw
  })

  return (
    <group ref={group} visible={false} scale={1.1}>
      {kind && <Body kind={kind} />}
      {line && (
        <Label
          text={line}
          height={0.3}
          position={[0, 2.9, 0]}
          billboard
          opts={{ color: '#111', stroke: null, strokeWidth: 0, bg: '#ffffff', size: 56 }}
        />
      )}
    </group>
  )
}

export default Chaser
