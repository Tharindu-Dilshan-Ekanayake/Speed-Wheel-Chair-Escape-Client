import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { memo, useMemo } from 'react'
import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { lavaMaterial, neonMaterial, studMaterial } from '../textures'

/**
 * Renders a list of axis-aligned boxes as a handful of merged meshes (one per
 * colour) - hundreds of blocks cost only a few draw calls - plus fixed Rapier
 * colliders for the solid / kill ones.
 */
export const BoxChunk = memo(function BoxChunk({ boxes, visible = true, colliders = true }) {
  const meshes = useMemo(() => {
    const groups = new Map()
    for (const b of boxes) {
      const glow = b.kind === 'kill'
      const neon = !!b.neon
      const key = `${b.color}|${glow}|${b.cell || ''}|${neon}`
      if (!groups.has(key)) groups.set(key, { color: b.color, glow, neon, cell: b.cell, geos: [] })
      const geo = b.sphere
        ? new SphereGeometry(b.w / 2, 20, 14)
        : b.barrel
          ? new CylinderGeometry(b.w / 2, b.w / 2, b.h, 14)
          : new BoxGeometry(b.w, b.h, b.d)
      geo.translate(b.x, b.y, b.z)
      groups.get(key).geos.push(geo)
    }
    return [...groups.values()].map((g) => {
      const geometry = mergeGeometries(g.geos, false)
      g.geos.forEach((x) => x.dispose())
      const material = g.neon ? neonMaterial(g.color) : g.glow ? lavaMaterial(g.color, g.cell) : studMaterial(g.color)
      return { geometry, material, neon: g.neon, key: `${g.color}|${g.glow}|${g.cell || ''}|${g.neon}` }
    })
  }, [boxes])

  const solids = useMemo(() => boxes.filter((b) => b.kind !== 'deco'), [boxes])

  return (
    <>
      <group visible={visible}>
        {meshes.map((m) => (
          <mesh key={m.key} geometry={m.geometry} material={m.material} castShadow={!m.neon} receiveShadow={!m.neon} />
        ))}
      </group>
      {colliders && (
        <RigidBody type="fixed" colliders={false} friction={0.1}>
          {solids.map((b, i) =>
            b.barrel ? (
              <CylinderCollider key={i} args={[b.h / 2, b.w / 2]} position={[b.x, b.y, b.z]} />
            ) : (
              <CuboidCollider key={i} args={[b.w / 2, b.h / 2, b.d / 2]} position={[b.x, b.y, b.z]} />
            ),
          )}
        </RigidBody>
      )}
    </>
  )
})

export default BoxChunk
