import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'

import { trailById } from '../../shared/gameData'
import { glowTexture } from '../textures'

const N = 70
const LIFE = 0.9
const _p = new Vector3()

/**
 * Sparkle trail left behind the wheels while moving. Lives in world space (render it
 * at the scene root) and samples `targetRef`'s world position every frame.
 */
export function Trail({ trailId, targetRef, movingRef }) {
  const trail = trailById(trailId)
  const colorKey = (trail?.colors || []).join(',')
  const parts = useMemo(() => Array.from({ length: N }, () => ({ x: 0, y: -999, z: 0, age: LIFE, c: 0 })), [])
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(N * 3), 3))
    return g
  }, [])
  const palette = useMemo(() => (colorKey ? colorKey.split(',').map((c) => new Color(c)) : []), [colorKey])
  const state = useRef({ next: 0, last: new Vector3(0, -999, 0), ci: 0 })

  useFrame((_s, dt) => {
    if (!palette.length || !targetRef.current) return
    targetRef.current.getWorldPosition(_p)
    const st = state.current
    const moving = movingRef?.current ?? true
    if (moving && _p.distanceTo(st.last) > 0.22) {
      st.last.copy(_p)
      const q = parts[st.next]
      q.x = _p.x + (Math.random() - 0.5) * 0.5
      q.y = _p.y + 0.35 + Math.random() * 0.4
      q.z = _p.z + (Math.random() - 0.5) * 0.5
      q.age = 0
      q.c = st.ci = (st.ci + 1) % palette.length
      st.next = (st.next + 1) % N
    }
    const pos = geometry.attributes.position
    const col = geometry.attributes.color
    for (let i = 0; i < N; i += 1) {
      const q = parts[i]
      q.age += dt
      const k = Math.min(1, q.age / LIFE)
      pos.setXYZ(i, q.x, k >= 1 ? -999 : q.y + k * 0.4, q.z)
      const c = palette[q.c] || palette[0]
      col.setXYZ(i, c.r * (1 - k), c.g * (1 - k), c.b * (1 - k))
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })

  if (!palette.length) return null
  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={glowTexture()}
        size={0.55}
        vertexColors
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export default Trail
