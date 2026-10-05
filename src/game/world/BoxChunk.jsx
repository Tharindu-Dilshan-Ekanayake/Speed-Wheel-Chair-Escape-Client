import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { memo, useMemo, useEffect } from 'react'
import { BufferGeometry, Float32BufferAttribute, CylinderGeometry, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { lavaMaterial, neonMaterial, studMaterial } from '../textures'
import { boxFaces } from './boxFaces'

function surfaceGeometry(faces) {
  const positions = [], normals = [], uv = []
  for (const { axis, u, v, sign, plane, rect: [a, b, c, d] } of faces) {
    const corners = [[a, c], [b, c], [b, d], [a, d]]
    for (const i of sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) {
      const point = [0, 0, 0], normal = [0, 0, 0]
      point[axis] = plane; point[u] = corners[i][0]; point[v] = corners[i][1]
      normal[axis] = sign
      positions.push(...point); normals.push(...normal)
      uv.push((corners[i][0] - a) / (b - a), (corners[i][1] - c) / (d - c))
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return geometry
}

/**
 * Renders a list of axis-aligned boxes as a handful of merged meshes (one per
 * colour) - hundreds of blocks cost only a few draw calls - plus fixed Rapier
 * colliders for the solid / kill ones.
 */
export const BoxChunk = memo(function BoxChunk({ boxes, visible = true, colliders = true }) {
  const meshes = useMemo(() => {
    const groups = new Map()
    const surfaces = boxFaces(boxes)
    for (const [index, b] of boxes.entries()) {
      if (surfaces[index]?.length === 0) continue
      const glow = b.kind === 'kill'
      const neon = !!b.neon
      const key = `${b.color}|${glow}|${b.cell || ''}|${neon}|${b.tile}|${!!b.checker}`
      if (!groups.has(key)) groups.set(key, { key, color: b.color, glow, neon, cell: b.cell, tile: b.tile, checker: !!b.checker, geos: [] })
      const geo = b.sphere
        ? new SphereGeometry(b.w / 2, 20, 14)
        : b.barrel
          ? new CylinderGeometry(b.w / 2, b.w / 2, b.h, 14)
          : surfaceGeometry(surfaces[index])
      if (b.sphere || b.barrel) geo.translate(b.x, b.y, b.z)
      groups.get(key).geos.push(geo.index ? geo.toNonIndexed() : geo)
      if (geo.index) geo.dispose()
    }
    return [...groups.values()].map((g) => {
      const geometry = mergeGeometries(g.geos, false)
      g.geos.forEach((x) => x.dispose())
      const material = g.neon ? neonMaterial(g.color) : g.glow ? lavaMaterial(g.color, g.cell) : studMaterial(g.color, { tile: g.tile, checker: g.checker })
      return { geometry, material, neon: g.neon, key: g.key }
    })
  }, [boxes])
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes])

  const solids = useMemo(() => boxes.filter((b) => b.kind !== 'deco'), [boxes])

  return (
    <>
      <group visible={visible}>
        {meshes.map((m) => (
          <mesh
            key={m.key}
            geometry={m.geometry}
            material={m.material}
            castShadow={!m.neon}
            receiveShadow
            renderOrder={m.neon ? 2 : 1}
            // Geometry is merged in world coordinates. Letting Three.js infer a
            // local frustum sphere can cull parts after camera/player movement.
            frustumCulled={false}
          />
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
