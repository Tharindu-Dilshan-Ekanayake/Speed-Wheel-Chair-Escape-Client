import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'

import { PETS, RARITY } from '../shared/gameData'
import { Aura } from './effects/Aura'
import { Label } from './world/Label'

/**
 * A cute chibi animal: big round head, shiny eyes, rosy cheeks, wagging tail.
 * Faces +z. Legendary / epic pets also get sparkles and a floating halo.
 */
export function PetModel({ type, showLabel = false }) {
  const pet = PETS[type] || PETS.dog
  const body = pet.body
  const acc = pet.accent
  const rarityColor = RARITY[pet.rarity].color
  const fancy = pet.rarity === 'legendary' || pet.rarity === 'epic'
  const tail = useRef()
  const head = useRef()
  const halo = useRef()
  const wings = useRef([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (tail.current) tail.current.rotation.y = Math.sin(t * 9) * 0.55
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 2.2) * 0.07
      head.current.rotation.x = Math.sin(t * 3.1) * 0.04
    }
    if (halo.current) halo.current.rotation.z += 0.03
    wings.current.forEach((w, i) => {
      if (w) w.rotation.z = (i ? -1 : 1) * (0.5 + Math.sin(t * 10) * 0.45)
    })
  })

  const mat = (c, e = 0, r = 0.5) => <meshStandardMaterial color={c} roughness={r} emissive={c} emissiveIntensity={e} />
  const glow = fancy ? 0.18 : 0.04
  const slime = type === 'slime'

  const ears = (() => {
    switch (pet.ears) {
      case 'flop':
        return [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.3, 0.14, 0.04]} rotation={[0, 0, s * 0.7]} scale={[0.6, 1.2, 0.5]}>
            <sphereGeometry args={[0.15, 12, 10]} />
            {mat(acc)}
          </mesh>
        ))
      case 'point':
        return [-1, 1].map((s) => (
          <group key={s} position={[s * 0.2, 0.34, 0.04]} rotation={[0, 0, s * -0.22]}>
            <mesh>
              <coneGeometry args={[0.14, 0.3, 8]} />
              {mat(body)}
            </mesh>
            <mesh position={[0, -0.02, 0.05]} scale={0.6}>
              <coneGeometry args={[0.11, 0.24, 8]} />
              {mat('#ffb3c1')}
            </mesh>
          </group>
        ))
      case 'long':
        return [-1, 1].map((s) => (
          <group key={s} position={[s * 0.15, 0.48, 0.02]} rotation={[0, 0, s * -0.12]}>
            <mesh scale={[0.5, 1.5, 0.35]}>
              <sphereGeometry args={[0.15, 12, 10]} />
              {mat(body)}
            </mesh>
            <mesh position={[0, 0, 0.04]} scale={[0.28, 1.1, 0.2]}>
              <sphereGeometry args={[0.15, 10, 8]} />
              {mat(acc)}
            </mesh>
          </group>
        ))
      case 'round':
        return [-1, 1].map((s) => (
          <group key={s} position={[s * 0.26, 0.3, 0.02]}>
            <mesh>
              <sphereGeometry args={[0.13, 12, 10]} />
              {mat(body === '#ffffff' ? '#222' : body)}
            </mesh>
            <mesh position={[0, 0, 0.06]} scale={0.6}>
              <sphereGeometry args={[0.1, 10, 8]} />
              {mat(acc)}
            </mesh>
          </group>
        ))
      case 'horn':
        return (
          <>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.2, 0.38, 0]} rotation={[0.2, 0, s * -0.4]}>
                <coneGeometry args={[0.07, 0.34, 8]} />
                {mat(acc, 0.35)}
              </mesh>
            ))}
            {type === 'unicorn' && (
              <mesh position={[0, 0.46, 0.12]} rotation={[0.25, 0, 0]}>
                <coneGeometry args={[0.06, 0.4, 8]} />
                {mat('#ffd23d', 0.5)}
              </mesh>
            )}
          </>
        )
      case 'mane':
        return (
          <mesh position={[0, 0.0, -0.02]} scale={[1.2, 1.1, 0.7]}>
            <sphereGeometry args={[0.4, 14, 10]} />
            {mat(acc)}
          </mesh>
        )
      case 'wing':
        return (
          <>
            {[-1, 1].map((s, i) => (
              <group key={s} ref={(el) => (wings.current[i] = el)} position={[s * 0.3, -0.2, -0.3]}>
                <mesh position={[s * 0.3, 0.1, 0]} scale={[1, 0.12, 0.6]}>
                  <sphereGeometry args={[0.3, 10, 8]} />
                  {mat(acc, 0.35)}
                </mesh>
              </group>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={`e${s}`} position={[s * 0.18, 0.36, 0.04]} rotation={[0, 0, s * -0.25]}>
                <coneGeometry args={[0.1, 0.24, 6]} />
                {mat(body)}
              </mesh>
            ))}
          </>
        )
      case 'eyes':
        return [-1, 1].map((s) => (
          <group key={s} position={[s * 0.2, 0.26, 0.08]}>
            <mesh>
              <sphereGeometry args={[0.14, 12, 10]} />
              {mat(body)}
            </mesh>
            <mesh position={[0, 0.01, 0.1]}>
              <sphereGeometry args={[0.095, 10, 8]} />
              {mat('#ffffff')}
            </mesh>
            <mesh position={[0, 0.01, 0.17]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshBasicMaterial color="#111" />
            </mesh>
          </group>
        ))
      default:
        return null
    }
  })()

  const bigTail = ['fox', 'cat', 'tiger', 'lion', 'hellhound'].includes(type)
  const dragonTail = ['goldDragon', 'rDragon', 'demon', 'overlord', 'imp'].includes(type)
  const dragonWings = ['goldDragon', 'rDragon', 'demon', 'overlord'].includes(type)
  const dragonSpines = ['goldDragon', 'rDragon', 'demon', 'overlord', 'imp'].includes(type)

  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.42, -0.04]} scale={slime ? [0.55, 0.36, 0.55] : [0.42, 0.36, 0.5]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        {slime ? <meshStandardMaterial color={body} transparent opacity={0.85} roughness={0.15} emissive={body} emissiveIntensity={0.25} /> : mat(body, glow)}
      </mesh>
      {/* belly */}
      {!slime && (
        <mesh position={[0, 0.36, 0.17]} scale={[0.3, 0.26, 0.28]}>
          <sphereGeometry args={[1, 14, 10]} />
          {mat(acc === body ? '#ffffff' : acc, 0, 0.7)}
        </mesh>
      )}

      {/* Bright collar, chest jewel, and coat markings give each pet a richer silhouette. */}
      {!slime && (
        <>
          <mesh position={[0, 0.67, 0.13]} rotation={[Math.PI / 2, 0, 0]} scale={[0.78, 0.78, 1]}>
            <torusGeometry args={[0.25, 0.035, 8, 20]} />
            {mat(rarityColor, 0.16, 0.28)}
          </mesh>
          <mesh position={[0, 0.57, 0.4]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1.2, 0.7]}>
            <octahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial color={rarityColor} emissive={rarityColor} emissiveIntensity={0.55} metalness={0.45} roughness={0.22} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`mark-${s}`} position={[s * 0.25, 0.48, 0.38]} scale={[0.09, 0.07, 0.035]}>
              <sphereGeometry args={[1, 10, 8]} />
              {mat(acc, 0.12, 0.4)}
            </mesh>
          ))}
        </>
      )}

      {/* Colorful fan wings and glowing back spines make dragons read as dragons. */}
      {dragonWings && [-1, 1].map((s, i) => (
        <group key={`dragon-wing-${s}`} ref={(el) => (wings.current[i] = el)} position={[s * 0.28, 0.58, -0.22]}>
          <mesh position={[s * 0.27, 0.12, -0.03]} rotation={[0, 0, s * -0.28]} scale={[0.48, 0.27, 0.09]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={0.22} side={2} roughness={0.38} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[s * (0.12 + j * 0.12), 0.2 + j * 0.035, 0.015]} rotation={[0, 0, s * -0.48]}>
              <cylinderGeometry args={[0.018, 0.025, 0.34, 5]} />
              {mat(rarityColor, 0.3, 0.3)}
            </mesh>
          ))}
        </group>
      ))}
      {dragonSpines && [0, 1, 2].map((i) => (
        <mesh key={`spine-${i}`} position={[0, 0.69 - i * 0.12, -0.3 - i * 0.07]} rotation={[0.18, 0, 0]}>
          <coneGeometry args={[0.075 - i * 0.01, 0.2, 6]} />
          {mat(i === 1 ? rarityColor : acc, 0.3, 0.28)}
        </mesh>
      ))}

      <group ref={head} position={[0, 0.82, 0.22]}>
        {/* big round head */}
        <mesh scale={[1.08, 0.95, 1]} castShadow>
          <sphereGeometry args={[0.36, 20, 16]} />
          {slime ? <meshStandardMaterial color={body} transparent opacity={0.9} emissive={body} emissiveIntensity={0.25} /> : mat(body, glow)}
        </mesh>
        {/* snout + nose */}
        {pet.ears !== 'eyes' && type !== 'chick' && (
          <>
            <mesh position={[0, -0.07, 0.31]} scale={[1.2, 0.8, 0.9]}>
              <sphereGeometry args={[0.12, 12, 10]} />
              {mat(acc === body ? '#ffffff' : acc, 0, 0.7)}
            </mesh>
            <mesh position={[0, -0.02, 0.4]}>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshBasicMaterial color="#2b1a1a" />
            </mesh>
          </>
        )}
        {type === 'chick' && (
          <mesh position={[0, -0.05, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.08, 0.16, 8]} />
            {mat('#ff9a1a')}
          </mesh>
        )}
        {/* shiny eyes */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.15, 0.07, 0.31]}>
            <mesh scale={[1, 1.15, 0.6]}>
              <sphereGeometry args={[0.08, 12, 10]} />
              <meshBasicMaterial color="#14111c" />
            </mesh>
            <mesh position={[s * -0.02, 0.035, 0.045]}>
              <sphereGeometry args={[0.028, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {/* rosy cheeks */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.25, -0.04, 0.27]} scale={[1, 0.65, 0.35]}>
            <sphereGeometry args={[0.065, 10, 8]} />
            <meshBasicMaterial color="#ff8fa3" transparent opacity={0.75} />
          </mesh>
        ))}
        {ears}
      </group>

      {/* tail */}
      <group ref={tail} position={[0, 0.5, -0.46]}>
        {dragonTail ? (
          <mesh position={[0, 0, -0.2]} rotation={[-Math.PI / 2 - 0.3, 0, 0]}>
            <coneGeometry args={[0.1, 0.5, 8]} />
            {mat(acc, 0.2)}
          </mesh>
        ) : (
          <mesh position={[0, 0.05, -0.1]} scale={bigTail ? [0.7, 0.8, 1.6] : 1}>
            <sphereGeometry args={[bigTail ? 0.14 : 0.1, 10, 8]} />
            {mat(bigTail ? acc : body)}
          </mesh>
        )}
      </group>

      {/* little feet */}
      {[
        [-0.18, 0.2],
        [0.18, 0.2],
        [-0.18, -0.26],
        [0.18, -0.26],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.09, z]} scale={[1, 0.7, 1.25]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          {mat(acc === body ? '#ffffff' : acc)}
        </mesh>
      ))}

      {fancy && (
        <>
          <group ref={halo} position={[0, 1.55, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <torusGeometry args={[0.24, 0.035, 8, 24]} />
              <meshBasicMaterial color={rarityColor} toneMapped={false} />
            </mesh>
          </group>
          <Aura colors={[rarityColor, '#ffffff']} count={16} radius={0.65} height={1.4} size={0.22} />
        </>
      )}
      {showLabel && (
        <Label text={`${pet.name} x${pet.mult}`} height={0.32} position={[0, 1.8, 0]} billboard opts={{ stroke: '#000', strokeWidth: 0.2, color: rarityColor }} />
      )}
    </group>
  )
}

const SLOTS = [
  [-1.5, -1.4],
  [1.5, -1.4],
  [0, -2.4],
  [-2.4, -2.5],
  [2.4, -2.5],
]
const _t = new Vector3()

/**
 * Pets trailing their owner. `getAnchor()` returns the owner's { x, y, z, yaw }.
 */
export function PetFollowers({ pets, getAnchor }) {
  const refs = useRef([])
  const state = useMemo(() => pets.map(() => ({ init: false, yaw: 0 })), [pets])

  useFrame((s, dt) => {
    const a = getAnchor()
    if (!a) return
    const sin = Math.sin(a.yaw)
    const cos = Math.cos(a.yaw)
    const ground = a.y - 1.0
    pets.forEach((_, i) => {
      const g = refs.current[i]
      if (!g) return
      const [lx, lz] = SLOTS[i % SLOTS.length]
      // Local (lx, lz) -> world: forward is (sin, cos), right is (cos, -sin).
      _t.set(a.x + lx * cos + lz * sin, ground + 0.5 + Math.sin(s.clock.elapsedTime * 3 + i) * 0.18, a.z - lx * sin + lz * cos)
      const st = state[i]
      if (!st.init || g.position.distanceTo(_t) > 25) {
        g.position.copy(_t)
        st.init = true
      }
      const dx = _t.x - g.position.x
      const dz = _t.z - g.position.z
      g.position.lerp(_t, 1 - Math.exp(-dt * 6))
      if (dx * dx + dz * dz > 0.02) st.yaw = Math.atan2(dx, dz)
      else st.yaw = a.yaw
      let d = st.yaw - g.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      g.rotation.y += d * Math.min(1, dt * 8)
    })
  })

  return pets.map((type, i) => (
    <group key={`${type}-${i}`} ref={(el) => (refs.current[i] = el)} scale={0.95}>
      <PetModel type={type} />
    </group>
  ))
}

export default PetFollowers
