import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from 'three'

import { runtime } from '../../state/store'
import { glowTexture } from '../textures'

const DURATION = 1.7
const SPARKS = 64
const COLORS = ['#ff4d1f', '#ffb21c', '#fff1a6', '#55d9ff']

function EnergySparks({ fxKey }) {
  const points = useRef()
  const seeds = useMemo(
    () => Array.from({ length: SPARKS }, (_, i) => ({
      angle: (i / SPARKS) * Math.PI * 2,
      phase: Math.random(),
      radius: 0.65 + Math.random() * 0.55,
      height: 1.5 + Math.random() * 1.25,
      speed: 0.75 + Math.random() * 0.65,
    })),
    [],
  )
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(SPARKS * 3), 3))
    const color = new Float32Array(SPARKS * 3)
    const c = new Color()
    for (let i = 0; i < SPARKS; i += 1) {
      c.set(COLORS[i % COLORS.length])
      color.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(color, 3))
    return g
  }, [])

  useFrame((state) => {
    const at = runtime.flashes.get(fxKey)
    const age = at ? (performance.now() - at) / 1000 : 99
    const progress = Math.min(1, age / DURATION)
    const position = geometry.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < SPARKS; i += 1) {
      const spark = seeds[i]
      const p = (spark.phase + age * spark.speed) % 1
      const angle = spark.angle + t * (i % 2 ? 4.8 : -4.2)
      const radius = spark.radius + Math.sin(t * 10 + i) * 0.12
      const flicker = Math.sin(t * 18 + i * 2.7) * 0.12
      position.setXYZ(
        i,
        Math.cos(angle) * (radius + flicker),
        0.25 + p * spark.height,
        Math.sin(angle) * (radius + flicker),
      )
    }
    position.needsUpdate = true
    points.current.visible = progress < 1
    points.current.material.opacity = Math.max(0, 1 - progress * 0.8)
    points.current.rotation.y = t * 0.35
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={glowTexture()}
        size={0.3}
        vertexColors
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

/**
 * Fire and electric spark burst around the player when leveling up / rebirthing.
 * Keyed by `fxKey` in
 * runtime.flashes ('me' for the local player, otherwise the session id).
 */
export function LevelUpFx({ fxKey }) {
  const group = useRef()

  useFrame(() => {
    const at = runtime.flashes.get(fxKey)
    const age = at ? (performance.now() - at) / 1000 : 99
    const on = age < DURATION
    group.current.visible = on
  })

  return (
    <group ref={group} visible={false}>
      <EnergySparks fxKey={fxKey} />
    </group>
  )
}

export default LevelUpFx
