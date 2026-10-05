import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

import { CORRIDOR_W, WALL_H, STAGE_GATE_H, STAGE_DOOR_W, stageAccess, stageRequirement, formatNum, tideLevel } from '../../shared/gameData'
import { runtime, serverTime, useGame } from '../../state/store'
import { crackTexture, glowTexture, studMaterial } from '../textures'
import BoxChunk from './BoxChunk'
import Hazards from './Hazards'
import { Emoji, Label } from './Label'

const OUTLINE = { stroke: '#000', strokeWidth: 0.18 }

/** Soft overlapping ripples for water, tiled so wide rivers keep their detail. */
function waterTexture(repeat = [1, 1]) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 256, 256)
  gradient.addColorStop(0, '#087f9b')
  gradient.addColorStop(0.5, '#13bfd0')
  gradient.addColorStop(1, '#087f9b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  for (let row = -1; row < 9; row += 1) {
    ctx.beginPath()
    for (let x = -16; x <= 272; x += 4) {
      const y = row * 34 + Math.sin(x * 0.035 + row * 1.8) * 7 + Math.sin(x * 0.012 - row) * 4
      if (x === -16) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = row % 2 ? 'rgba(173,255,255,.34)' : 'rgba(3,91,133,.36)'
    ctx.lineWidth = row % 2 ? 4 : 8
    ctx.stroke()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(229,255,255,.24)'
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(...repeat)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Scenery falls stay against the walls, clear of each stage's playable adventure. */
function RiverFalls({ stage }) {
  const river = stage.rivers[0]
  const pink = river.kind === 'pink'
  const tex = useMemo(() => river.kind === 'water'
    ? waterTexture([1, 3])
    : crackTexture(river.kind === 'toxic' ? '#123321' : pink ? '#ff4f9a' : '#fa4909', river.kind === 'toxic' ? '#63ff00' : pink ? '#ffd0e5' : '#ffb01c', [1, 3]), [river, pink])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame((_state, dt) => { tex.offset.y += dt * 0.3 })
  return <group>
    {[-1, 1].flatMap((side) => [0.2, 0.5, 0.8].map((fraction) => (
      <mesh key={`${side}-${fraction}`} position={[stage.routeX + side * (CORRIDOR_W / 2 - 1), 5.3, river.z + river.d * (fraction - 0.5)]} rotation={[0, -side * Math.PI / 2, 0]}>
        <boxGeometry args={[3.5, 17.5, 0.25]} />
        <meshStandardMaterial map={tex} roughness={0.55} emissive={river.kind === 'water' ? '#086b8c' : river.kind === 'toxic' ? '#123321' : pink ? '#a51f62' : '#b53608'} emissiveIntensity={0.25} />
      </mesh>
    )))}
  </group>
}

/** Lava river: a scrolling molten surface just above the kill volume, with a warm glow and rising embers. */
function LavaRiver({ river }) {
  const surface = useRef()
  const volume = useRef()
  const redStone = river.style === 'redStone'
  const water = river.kind === 'water'
  const pink = river.kind === 'pink'
  const tex = useMemo(() => {
    const toxic = river.kind === 'toxic'
    return water
      ? waterTexture([river.w / 14, river.d / 14])
      : crackTexture(toxic ? '#10291c' : pink ? '#ff4f9a' : '#f0440a', toxic ? '#67ff00' : pink ? '#ffd0e5' : '#ffac12', [river.w / 9, river.d / 9])
  }, [river, water, pink])
  const glow = useMemo(() => glowTexture(), [])
  const embers = useMemo(() => {
    const n = 140
    const pos = new Float32Array(n * 3)
    const sp = new Float32Array(n)
    for (let i = 0; i < n; i += 1) {
      pos[i * 3] = river.x + (Math.random() - 0.5) * river.w
      pos[i * 3 + 1] = river.y + Math.random() * 2
      pos[i * 3 + 2] = river.z + (Math.random() - 0.5) * river.d
      sp[i] = 0.8 + Math.random() * 1.6
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    return { geo, sp }
  }, [river])
  useEffect(() => () => { tex.dispose(); embers.geo.dispose() }, [tex, embers])
  useFrame((_s, dt) => {
    if (river.tide) {
      const level = tideLevel(river.tide, serverTime()).level
      surface.current.position.y = level - river.y
      // Keep the bottom anchored below the original river bed as the surface rises.
      const depth = level - (river.y - 0.65)
      volume.current.scale.y = depth
      volume.current.position.y = river.y - depth / 2 - 0.02
    }
    tex.offset.x -= dt * river.vx / 12
    const a = embers.geo.attributes.position
    for (let i = 0; i < embers.sp.length; i += 1) {
      let y = a.array[i * 3 + 1] + embers.sp[i] * dt
      if (y > river.y + 2) y = river.y
      a.array[i * 3 + 1] = y
    }
    a.needsUpdate = true
  })
  return (
    <group ref={surface}>
      {river.tide && <mesh ref={volume} position={[river.x, river.y - 0.345, river.z]} scale={[1, 0.65, 1]}>
        <boxGeometry args={[river.w, 1, river.d]} />
        <meshStandardMaterial map={tex} roughness={0.55} emissive={water ? '#08718b' : river.kind === 'toxic' ? '#1d5818' : pink ? '#a51f62' : '#b82c06'} emissiveIntensity={0.35} />
      </mesh>}
      <mesh position={[river.x, river.y, river.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[river.w, river.d]} />
        <meshStandardMaterial map={tex} roughness={0.55} emissive={water ? '#08718b' : river.kind === 'toxic' ? '#1d5818' : pink ? '#a51f62' : '#b82c06'} emissiveIntensity={0.35} />
      </mesh>
      {!water && <mesh position={[river.x, river.y + 0.04, river.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[river.w, river.d]} />
        <meshBasicMaterial map={glow} color={redStone ? '#ff3d24' : river.kind === 'toxic' ? '#5dff3a' : pink ? '#ff75bd' : '#ff6a1a'} transparent opacity={0.12} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>}
      <points geometry={embers.geo} frustumCulled={false}>
        <pointsMaterial color={water ? '#c7fff4' : redStone ? '#ffb08a' : river.kind === 'toxic' ? '#b8ff6b' : pink ? '#ffd0eb' : '#ffb347'} size={water ? 0.12 : 0.3} transparent opacity={water ? 0.4 : 0.9} depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  )
}

/** Gentle snowfall filling the stage corridor (snow themes only). */
function Snowfall({ stage }) {
  const ref = useRef()
  const { geo, speeds } = useMemo(() => {
    const n = 900
    const pos = new Float32Array(n * 3)
    const sp = new Float32Array(n)
    const z0 = stage.z0
    const len = stage.z0 - stage.safe.z1
    for (let i = 0; i < n; i += 1) {
      pos[i * 3] = stage.routeX + (Math.random() - 0.5) * CORRIDOR_W
      pos[i * 3 + 1] = Math.random() * WALL_H
      pos[i * 3 + 2] = z0 - Math.random() * len
      sp[i] = 1.2 + Math.random() * 1.6
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    return { geo: g, speeds: sp }
  }, [stage])
  useFrame((_s, dt) => {
    const a = geo.attributes.position
    for (let i = 0; i < speeds.length; i += 1) {
      let y = a.array[i * 3 + 1] - speeds[i] * dt
      if (y < 0) y = WALL_H
      a.array[i * 3 + 1] = y
    }
    a.needsUpdate = true
  })
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#ffffff" size={0.22} transparent opacity={0.9} depthWrite={false} />
    </points>
  )
}

function EntryGate({ stage }) {
  const profile = useGame((s) => s.profile)
  const devStage = useGame((s) => s.expedition?.devStage)
  const toast = useGame((s) => s.toast)
  const lastNotice = useRef(0)
  const reason = profile && devStage !== stage.k ? stageAccess(profile, stage.k) : null
  const req = stageRequirement(stage.k)
  useFrame(() => {
    if (!reason) return
    const { x, z } = runtime.me
    if (Math.abs(x - stage.routeX) > CORRIDOR_W / 2 + 1 || Math.abs(z - (stage.z0 + 0.4)) > 2.5) return
    const now = Date.now()
    if (now - lastNotice.current < 4000) return
    lastNotice.current = now
    toast(`${reason} to enter this stage. Head to the lobby to upgrade!`, 'error')
  })
  const theme = stage.theme
  const glassBlue = '#63d9ff'
  const stageName = theme.name || `Stage ${stage.k}`
  const adventureName = stage.def?.adventure || 'Adventure'
  const requirement = `LEVEL ${req.level}  /  ${req.chair.name.toUpperCase()}`
  return <group position={[stage.routeX, 0, stage.z0 + 0.4]}>
    {/* Clean doorway barrier: exactly the same opening size as the safe-room gates. */}
    {[-1, 1].map((side) => <mesh key={`portal-pillar-${side}`} position={[side * (STAGE_DOOR_W / 2 + 0.75), STAGE_GATE_H / 2, 0]}>
      <boxGeometry args={[1.5, STAGE_GATE_H, 1.25]} />
      <meshStandardMaterial color={glassBlue} emissive={reason ? '#ff2948' : glassBlue} emissiveIntensity={reason ? 0.55 : 0.9} metalness={0.38} roughness={0.18} />
    </mesh>)}
    <mesh position={[0, STAGE_GATE_H - 0.6, 0]}>
      <boxGeometry args={[STAGE_DOOR_W + 3, 1.2, 1.25]} />
      <meshStandardMaterial color={glassBlue} emissive={reason ? '#ff2948' : glassBlue} emissiveIntensity={reason ? 0.55 : 0.9} metalness={0.38} roughness={0.18} />
    </mesh>
    <mesh position={[0, STAGE_GATE_H / 2, 0.08]}>
      <planeGeometry args={[STAGE_DOOR_W - 0.5, STAGE_GATE_H - 1.1]} />
      <meshBasicMaterial color={reason ? '#b51f3d' : glassBlue} transparent opacity={0.18} depthWrite={false} side={2} />
    </mesh>
    {/* Transparent block-glass grid: the barrier reads clearly without hiding the stage behind it. */}
    {[[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]].map(([column, row]) => (
      <mesh key={`glass-block-${column}-${row}`} position={[column * 4.35, 7.8 + row * 3.55, 0.16]}>
        <boxGeometry args={[3.95, 3.2, 0.28]} />
        <meshPhysicalMaterial
          color={reason ? '#a51f3a' : glassBlue}
          emissive={reason ? '#ff2948' : glassBlue}
          emissiveIntensity={reason ? 0.45 : 0.62}
          transparent
          opacity={0.22}
          transmission={0.72}
          thickness={0.12}
          roughness={0.08}
          metalness={0.04}
          clearcoat={0.9}
          clearcoatRoughness={0.06}
        />
      </mesh>
    ))}
    {/* Large centre plaque stays readable, but remains see-through. */}
    <mesh position={[0, STAGE_GATE_H / 2, 0.12]}>
      <planeGeometry args={[STAGE_DOOR_W - 1.1, STAGE_GATE_H - 2.2]} />
      <meshBasicMaterial color="#0e3950" transparent opacity={0.14} depthWrite={false} side={2} />
    </mesh>
    {[-1, 1].map((side) => <mesh key={`frame-x-${side}`} position={[side * (STAGE_DOOR_W / 2 - 0.55), STAGE_GATE_H / 2, 0.18]}>
      <boxGeometry args={[0.22, STAGE_GATE_H - 3, 0.12]} />
      <meshBasicMaterial color={reason ? '#ff536a' : glassBlue} toneMapped={false} />
    </mesh>)}
    {[2.05, STAGE_GATE_H - 1.5].map((y) => <mesh key={`frame-y-${y}`} position={[0, y, 0.18]}>
      <boxGeometry args={[STAGE_DOOR_W - 1.1, 0.22, 0.12]} />
      <meshBasicMaterial color={reason ? '#ff536a' : glassBlue} toneMapped={false} />
    </mesh>)}
    <Label text={`STAGE ${String(stage.k).padStart(2, '0')}`} height={1.15} position={[0, 13.2, 0.25]} opts={{ ...OUTLINE, color: reason ? '#ff9aaa' : theme.accent }} />
    <Label text={stageName} height={2.35} position={[0, 10.5, 0.25]} opts={{ ...OUTLINE, color: '#ffffff' }} />
    <Label text={adventureName} height={1.35} position={[0, 8.25, 0.25]} opts={{ ...OUTLINE, color: '#d8f6ff' }} />
    <Label text={reason ? 'LOCKED' : 'READY TO ENTER'} height={0.95} position={[0, 5.85, 0.25]} opts={{ ...OUTLINE, color: reason ? '#ff7788' : '#6dffb3' }} />
    <Label text={`REQUIRES  ${requirement}`} height={0.78} position={[0, 4.25, 0.25]} opts={{ ...OUTLINE, color: '#ffe38a' }} />
    {reason && <RigidBody type="fixed" colliders={false}><CuboidCollider args={[STAGE_DOOR_W / 2, 10, 0.3]} position={[0, 10, 0]} /></RigidBody>}
  </group>
}

function Excavation({ stage }) {
  const expedition = useGame((s) => s.expedition)
  const sites = stage.digSites.filter((site) => (expedition?.dug[site.id] || 0) < site.hits)
  const boxes = sites.map((site) => ({ ...site, kind: 'solid' }))
  return <>
    <BoxChunk boxes={boxes} />
    {sites.map((site) => <group key={site.id} position={[site.x, site.y, site.z + site.d / 2 + 0.06]}>
      <Label text={'DIG · ' + (expedition?.dug[site.id] || 0) + '/' + site.hits} height={0.8} position={[0, 1.7, 0]} opts={OUTLINE} />
      {[0, 1, 2].map((i) => <mesh key={i} position={[(i - 1) * 1.4, 0, 0.04]} rotation={[0, 0, (i - 1) * 0.45]}><boxGeometry args={[0.08, 1.4 + (expedition?.dug[site.id] || 0) * 0.3, 0.08]} /><meshBasicMaterial color="#0d1826" /></mesh>)}
    </group>)}
    {stage.toolRack && <group position={[stage.toolRack.x, 0, stage.toolRack.z]}>
      <mesh position={[0, 0.6, 0]} material={studMaterial(stage.theme.wall2)}><boxGeometry args={[3, 1.2, 2]} /></mesh>
      <group position={[0, 2, 0]} rotation={[0, 0, -0.4]}>
        <mesh><cylinderGeometry args={[0.1, 0.12, 2.2, 8]} /><meshStandardMaterial color="#c28a4f" /></mesh>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[1.6, 0.26, 0.3]} /><meshStandardMaterial color="#b9ebff" metalness={0.75} roughness={0.2} /></mesh>
      </group>
      <Label text="PICKAXE · E" height={0.8} position={[0, 4, 0]} opts={OUTLINE} />
    </group>}
  </>
}

function StageRoof({ stage }) {
  const from = stage.theme.outdoor ? stage.safe.z0 : stage.ceil.from
  const length = from - stage.ceil.to
  const lights = Array.from({ length: 3 }, (_, i) => from - 8 - i * ((length - 16) / 2))
  return (
    <group>
      <mesh position={[stage.roofCenterX, WALL_H + 0.5, (from + stage.ceil.to) / 2]} material={studMaterial(stage.theme.wall, { tile: 0.65, checker: true })} receiveShadow>
        <boxGeometry args={[stage.roofWidth + 4, 1, length]} />
      </mesh>
      {lights.map((z) => (
        <group key={z} position={[stage.roofCenterX, WALL_H - 0.08, z]}>
          <mesh>
            <boxGeometry args={[10, 0.18, 1.1]} />
            <meshStandardMaterial color={stage.theme.accent} emissive={stage.theme.accent} emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WheelchairWallArt({ stage }) {
  const artZ = (stage.safe.z0 + stage.safe.z1) / 2
  const artY = WALL_H * 0.52
  return (
    <>
      {[[-1, stage.safe.x0 + 4.08], [1, stage.safe.x1 - 4.08]].map(([side, x]) => (
        <group key={side} position={[x, artY, artZ]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.18, 6.2, 8.5]} />
            <meshBasicMaterial color={stage.theme.accent} toneMapped={false} />
          </mesh>
          <mesh position={[side * 0.11, 0, 0]}>
            <boxGeometry args={[0.1, 5.4, 7.7]} />
            <meshBasicMaterial color={stage.theme.wall2} toneMapped={false} />
          </mesh>
          <Label text="♿" height={4.2} position={[side * 0.18, 0, 0]} rotation={[0, side * Math.PI / 2, 0]} opts={{ ...OUTLINE, color: '#ffffff' }} />
        </group>
      ))}
    </>
  )
}

/** Flowing water that shoves players sideways: scrolling chevrons show the direction. */
function Current({ c }) {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 128
    cv.height = 128
    const g = cv.getContext('2d')
    g.fillStyle = '#1f9cff'
    g.fillRect(0, 0, 128, 128)
    g.strokeStyle = 'rgba(255,255,255,0.8)'
    g.lineWidth = 12
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(40, 24)
    g.lineTo(88, 64)
    g.lineTo(40, 104)
    g.stroke()
    const t = new CanvasTexture(cv)
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.repeat.set((c.vx > 0 ? 1 : -1) * (c.w / 8), c.d / 8)
    return t
  }, [c])
  useFrame((_s, dt) => {
    tex.offset.x -= dt * Math.abs(c.vx) * 0.09 * (c.vx > 0 ? 1 : -1)
  })
  return (
    <mesh position={[c.x, 0.08, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[c.w, c.d]} />
      <meshStandardMaterial map={tex} roughness={0.65} />
    </mesh>
  )
}

function Pad({ pad }) {
  const rebirths = useGame((s) => s.profile?.rebirths ?? 0)
  const locked = pad.bonus && rebirths < pad.minRebirths
  const color = pad.bonus ? '#ff304f' : '#ffd522'
  const gold = !pad.bonus
  const panelGlow = useRef()
  const floorGlow = useRef()
  const glow = useMemo(() => glowTexture(), [])
  useEffect(() => () => glow.dispose(), [glow])
  useFrame((state) => {
    const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 2.6 + pad.z) * 0.2
    if (panelGlow.current) panelGlow.current.emissiveIntensity = pulse * 0.22
    if (floorGlow.current) floorGlow.current.opacity = (locked ? 0.12 : 0.22) + pulse * 0.13
  })
  return (
    <group position={[pad.x, 0, pad.z]}>
      <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[pad.w + 7, pad.d + 7]} />
        <meshBasicMaterial ref={floorGlow} map={glow} color={color} transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[pad.w, 0.22, pad.d]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.28} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[pad.w + 0.65, 0.2, pad.d + 0.65]} />
        <meshStandardMaterial color="#18202c" />
      </mesh>
      {/* A tall, framed beacon gives each return pad the bold look of the reference. */}
      <group position={[0, 0, -4.1]}>
        <mesh position={[0, 4.2, 0]}>
          <boxGeometry args={[pad.w + 1, 8.6, 0.5]} />
          <meshStandardMaterial color={gold ? '#e0a917' : '#c62c4c'} metalness={0.55} roughness={0.32} />
        </mesh>
        <mesh position={[0, 4.2, 0.28]}>
          <boxGeometry args={[pad.w - 0.45, 8.18, 0.12]} />
          <meshStandardMaterial ref={panelGlow} color={gold ? '#07519b' : '#53264e'} emissive={gold ? '#0868b4' : '#85223c'} emissiveIntensity={0.2} roughness={0.45} />
        </mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * (pad.w / 2 - 0.3), 4.2, 0.36]}>
          <boxGeometry args={[0.12, 8.05, 0.08]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>)}
      </group>
      {/* Compact 3D cup and handles beneath the reward text. */}
      <group position={[0, 0.25, -2.7]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.58, 0.42, 0.7, 12]} />
          <meshStandardMaterial color={gold ? '#ffe15c' : '#ff7288'} metalness={0.72} roughness={0.2} emissive={color} emissiveIntensity={0.32} />
        </mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 0.52, 0.51, 0]}>
          <torusGeometry args={[0.23, 0.07, 8, 16]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.4} />
        </mesh>)}
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.09, 0.09, 0.22, 10]} /><meshStandardMaterial color="#fff0b4" metalness={0.65} /></mesh>
        <mesh position={[0, -0.13, 0]}><boxGeometry args={[0.85, 0.16, 0.46]} /><meshStandardMaterial color={gold ? '#a26720' : '#81233d'} metalness={0.45} /></mesh>
        <mesh position={[0, -0.26, 0]}><boxGeometry args={[1.12, 0.16, 0.56]} /><meshStandardMaterial color={color} metalness={0.55} emissive={color} emissiveIntensity={0.2} /></mesh>
      </group>
      <Label text="RETURN" height={1.25} position={[0, 6.1, 0]} billboard opts={OUTLINE} />
      {[-1, 1].map((side) => <Emoji key={side} emoji="🏆" size={1.7} position={[side * (pad.w / 2 - 0.6), 1.6, 1]} billboard />)}
      <Label
        text={locked ? `🔒 Need ${pad.minRebirths} Rebirths` : 'Press E'}
        height={0.8}
        position={[0, 2.6, 0]}
        billboard
        opts={{ ...OUTLINE, color: locked ? '#ff9b9b' : '#9ff6ff' }}
      />
      <Label
        text={`+${formatNum(pad.wins)} Wins${pad.bonus ? ' 2x' : ''}`}
        height={1.6}
        position={[0, 4.5, 0]}
        billboard
        opts={{ ...OUTLINE, gradient: ['#fff6a0', '#ffc21a'] }}
      />
    </group>
  )
}

function Sign({ s }) {
  switch (s.kind) {
    case 'instruction':
      return null
    case 'title':
      return (
        <Label
          text={s.text}
          height={4.4}
          position={[s.x, s.y, s.z]}
          opts={{ ...OUTLINE, color: s.color }}
        />
      )
    case 'sub':
      return <Label text={s.text} height={1.3} position={[s.x, s.y, s.z]} opts={OUTLINE} />
    case 'mascot':
      return null
    case 'rec':
      return (
        <Label
          text={s.text}
          height={1.4}
          position={[s.x, s.y, s.z]}
          opts={{ stroke: null, strokeWidth: 0, bg: '#0f121e', size: 64 }}
        />
      )
    case 'safe':
      return (
        <group position={[s.x, s.y, s.z]}>
          <Label text="Safe Zone" height={2.6} opts={{ ...OUTLINE, color: s.color }} />
        </group>
      )
    case 'tip':
      return (
        <Label
          text={[
            { text: 'Tip:', color: '#ffe14d' },
            { text: 'Chairs, pets &' },
            { text: 'rebirths make', color: '#7dd8ff' },
            { text: 'you faster!', color: '#5dff3a' },
          ]}
          height={7}
          position={[s.x, s.y, s.z]}
          rotation={[0, Math.PI / 2, 0]}
          opts={{ ...OUTLINE, bg: '#141e46' }}
        />
      )
    case 'secret':
      return (
        <group position={[s.x, s.y, s.z]}>
          <Label text="SECRET!" height={2} opts={{ ...OUTLINE, gradient: ['#fff6a0', '#ffb300'] }} />
          <Emoji emoji="🤫" size={2.2} position={[0, 2.4, 0]} billboard />
        </group>
      )
    case 'finale':
      return (
        <group position={[s.x, s.y, s.z]}>
          <Label text={s.text} height={3} opts={{ ...OUTLINE, gradient: ['#fff8c4', '#ffb300'] }} />
          <Emoji emoji="🏆" size={4} position={[0, -4, 0.1]} />
        </group>
      )
    default:
      return null
  }
}

/**
 * One stage: static blocks always have colliders; visuals, hazards and signs only
 * render while the player is near, which keeps the frame cheap.
 */
export const Stage = memo(function Stage({ stage, near, visible }) {
  return (
    <>
      {/* Static course geometry must stay rendered while the camera/view stage changes.
          Colliders already exist for every stage, so hiding these meshes makes the
          player see invisible floors/bridges after a refresh or teleport. */}
      {/* Only keep nearby courses in the draw and physics lists. Every stage was
          previously meshed and collidable at once, causing transition spikes. */}
      {visible && <BoxChunk boxes={stage.boxes} colliders />}
      {near && <EntryGate stage={stage} />}
      {near && <Excavation stage={stage} />}
      {visible && <StageRoof stage={stage} />}
      {near && <WheelchairWallArt stage={stage} />}
      {near && (
        <>
          <Hazards hazards={stage.hazards} />

          {stage.rivers.map((r, i) => (
            <LavaRiver key={`r${i}`} river={r} />
          ))}
          {stage.k <= 3 && stage.rivers.length > 0 && <RiverFalls stage={stage} />}
          {stage.currents.map((c, i) => (
            <Current key={i} c={c} />
          ))}
          <Pad pad={stage.returnPad} />
          <Pad pad={stage.bonusPad} />
          {stage.theme.snow && <Snowfall stage={stage} />}
        </>
      )}
      {visible && stage.signs.map((s, i) => <Sign key={i} s={s} />)}
    </>
  )
})

export default Stage
