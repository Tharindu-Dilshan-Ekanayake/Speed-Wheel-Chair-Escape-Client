import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from 'three'

import { auraById } from '../../shared/gameData'
import { glowTexture } from '../textures'

/**
 * Glowing particles swirling up around a point. Used for chair auras (around the
 * wheels) and the cosmetic player auras (bigger, around the body).
 */
export function Aura({ colors = ['#ffffff'], rainbow = false, count = 36, radius = 1, height = 2.2, size = 0.35, speed = 1, y = 0 }) {
  const points = useRef()
  const seeds = useMemo(
    () => Array.from({ length: count }, () => ({ a: Math.random() * Math.PI * 2, p: Math.random(), r: 0.7 + Math.random() * 0.5, s: 0.6 + Math.random() * 0.8 })),
    [count],
  )
  const colorKey = colors.join(',')
  const geometry = useMemo(() => {
    const list = colorKey.split(',')
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    const col = new Float32Array(count * 3)
    const c = new Color()
    for (let i = 0; i < count; i += 1) {
      c.set(list[i % list.length] || '#ffffff')
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(col, 3))
    return g
  }, [count, colorKey])
  const tmp = useMemo(() => new Color(), [])

  useFrame((state, dt) => {
    const pos = geometry.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i += 1) {
      const s = seeds[i]
      s.p += dt * 0.35 * speed * s.s
      if (s.p > 1) s.p -= 1
      const a = s.a + t * 1.6 * speed * (i % 2 ? 1 : -1)
      const r = radius * s.r * (1 - s.p * 0.35)
      pos.setXYZ(i, Math.cos(a) * r, y + s.p * height, Math.sin(a) * r)
    }
    pos.needsUpdate = true
    if (rainbow) {
      const col = geometry.attributes.color
      for (let i = 0; i < count; i += 1) {
        tmp.setHSL((t * 0.3 + i / count) % 1, 1, 0.6)
        col.setXYZ(i, tmp.r, tmp.g, tmp.b)
      }
      col.needsUpdate = true
    }
    points.current.material.opacity = 0.85
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={glowTexture()}
        size={size}
        vertexColors
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export function ChairAura({ color, radius = 0.9 }) {
  if (!color) return null
  const rainbow = color === 'rainbow'
  return <Aura colors={rainbow ? ['#ffffff'] : [color, '#ffffff']} rainbow={rainbow} count={26} radius={radius} height={1.4} size={0.28} speed={1.3} />
}

export function PlayerAura({ auraId }) {
  const aura = auraById(auraId)
  if (!aura || !aura.colors.length) return null
  return <Aura colors={aura.colors} rainbow={aura.id === 'rainbow'} count={60} radius={1.25} height={2.8} size={0.42} speed={0.9} />
}

export default Aura
