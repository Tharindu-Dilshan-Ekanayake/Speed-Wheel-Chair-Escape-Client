import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, RepeatWrapping, SRGBColorSpace } from 'three'

import {
  CHAIRS,
  GATE_W,
  DAILY_COOLDOWN_MS,
  EGGS,
  LOBBY,
  LOBBY_HALF,
  LOBBY_SPAWN,
  STAGES,
  TREADMILLS,
  formatNum,
} from '../../shared/gameData'
import { useGame } from '../../state/store'
import { FONT, beamTexture, beltTexture, glowTexture, starTexture, studMaterial } from '../textures'
import Wheelchair from '../Wheelchair'
import { ChairAura } from '../effects/Aura'
import BoxChunk from './BoxChunk'
import { GATE_H, ZONES } from './lobbyLayout'
import { Label } from './Label'

const OUTLINE = { stroke: '#000', strokeWidth: 0.18 }

function priceLine(price, reb, owned, profile) {
  if (owned) return { text: 'OWNED', color: '#5dff3a' }
  if (reb && (profile?.rebirths || 0) < reb) return { text: `🔒 ${reb} REBIRTH${reb > 1 ? 'S' : ''}`, color: '#ff6b6b' }
  if (!price) return { text: 'FREE', color: '#5dff3a' }
  return { text: `🏆 ${formatNum(price)}`, color: '#ffe14d' }
}

/* ------------------------------------------------------------------ */

const RAINBOW_SPEED = 0.2

/**
 * Coloured glow for one treadmill, all fake light (additive, unlit) so it costs no real
 * lights: a pulsing pool on the floor, glowing edge strips and two light pillars by the
 * console. Owned treadmills burn bright; locked ones just smoulder.
 */
function TreadmillGlow({ spot, color, rainbow, owned }) {
  const glow = useMemo(() => glowTexture(), [])
  const beam = useMemo(() => beamTexture(), [])
  const pool = useRef()
  const strips = useRef([])
  const pillars = useRef([])
  const base = useMemo(() => new Color(color), [color])
  const tint = useMemo(() => new Color(), [])
  const white = useMemo(() => new Color('#ffffff'), [])
  const consoleX = spot.x - spot.l / 2 - 0.4

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (rainbow) base.setHSL((t * RAINBOW_SPEED) % 1, 1, 0.55)
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + spot.z)
    const power = owned ? 1 : 0.4
    if (pool.current) {
      pool.current.color.copy(base)
      pool.current.opacity = (0.3 + pulse * 0.2) * power
    }
    tint.copy(base).lerp(white, 0.25 + pulse * 0.3)
    for (const m of strips.current) if (m) m.color.copy(tint).multiplyScalar(0.55 + 0.45 * power)
    for (const m of pillars.current) {
      if (!m) continue
      m.color.copy(base)
      m.opacity = (0.3 + pulse * 0.15) * power
    }
  })

  return (
    <group>
      {/* Light pool spilling over the floor around the belt. */}
      <mesh position={[spot.x, 0.25, spot.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[spot.l + 9, spot.w + 9]} />
        <meshBasicMaterial
          ref={pool}
          map={glow}
          color={color}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* Edge strip lights. */}
      {[-1, 1].map((s, i) => (
        <mesh key={s} position={[spot.x, 0.22, spot.z + s * (spot.w / 2 - 0.2)]}>
          <boxGeometry args={[spot.l + 0.3, 0.07, 0.2]} />
          <meshBasicMaterial ref={(m) => (strips.current[i] = m)} color={color} toneMapped={false} />
        </mesh>
      ))}
      {/* Light pillars on the console posts. */}
      {[-1, 1].map((s, i) => (
        <mesh key={s} position={[consoleX, 3.2, spot.z + s * (spot.w / 2 - 0.2)]} renderOrder={2}>
          <cylinderGeometry args={[0.35, 1.1, 6, 16, 1, true]} />
          <meshBasicMaterial
            ref={(m) => (pillars.current[i] = m)}
            map={beam}
            color={color}
            transparent
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function Treadmill({ spot, def, owned, profile }) {
  const belt = useMemo(() => {
    const t = beltTexture()
    t.repeat.set(spot.l / 2, 1)
    return t
  }, [spot.l])
  const frameMat = useRef()
  const rainbow = def.color === 'rainbow'
  const tmp = useMemo(() => new Color(), [])

  useFrame((state, dt) => {
    belt.offset.x += dt * (owned ? 1.4 : 0.3)
    if (rainbow && frameMat.current) {
      tmp.setHSL((state.clock.elapsedTime * RAINBOW_SPEED) % 1, 1, 0.55)
      frameMat.current.color.copy(tmp)
      frameMat.current.emissive.copy(tmp)
    }
  })

  const color = rainbow ? '#ff3bd2' : def.color
  const consoleX = spot.x - spot.l / 2 - 0.4
  const status = priceLine(def.price, def.reb, owned, profile)
  return (
    <group>
      <TreadmillGlow spot={spot} color={color} rainbow={rainbow} owned={owned} />
      <mesh position={[spot.x, 0.09, spot.z]} receiveShadow>
        <boxGeometry args={[spot.l + 0.6, 0.18, spot.w + 0.6]} />
        <meshStandardMaterial ref={frameMat} color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[spot.x, 0.205, spot.z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[spot.w - 0.6, spot.l]} />
        <meshStandardMaterial map={belt} />
      </mesh>
      {/* Console posts + handlebar */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[consoleX, 1.6, spot.z + s * (spot.w / 2 - 0.2)]} material={studMaterial(color)} castShadow>
          <boxGeometry args={[0.45, 3.2, 0.45]} />
        </mesh>
      ))}
      <mesh position={[consoleX, 3.1, spot.z]} rotation={[0, 0, 0.5]} material={studMaterial(color)} castShadow>
        <boxGeometry args={[1.4, 0.4, spot.w]} />
      </mesh>
      <mesh position={[consoleX + 0.15, 3.35, spot.z]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.9, 0.06, spot.w * 0.6]} />
        <meshStandardMaterial color="#111" emissive="#2b6cff" emissiveIntensity={0.4} />
      </mesh>
      <Label
        text={[{ text: def.name, gradient: ['#ffffff', rainbow ? '#ff7bf2' : color] }, status]}
        height={1.6}
        position={[spot.x - 1, 5.2, spot.z]}
        billboard
        opts={OUTLINE}
      />
    </group>
  )
}

function ChairDisplay({ spot, chair, profile }) {
  const owned = profile?.chairs?.includes(chair.id)
  const equipped = profile?.chair === chair.id
  const status = equipped ? { text: 'EQUIPPED', color: '#5dff3a' } : priceLine(chair.price, chair.reb, owned, profile)
  const ref = useRef()
  useFrame((state) => {
    ref.current.rotation.y = -Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.8 + spot.z) * 0.35
  })
  return (
    <group position={[spot.x + 2.2, 1.09, spot.z]}>
      <group ref={ref}>
        <Wheelchair chairId={chair.id} scale={1.5} />
      </group>
      {chair.aura && <ChairAura color={chair.aura} radius={1.4} />}
      <Label
        text={[
          { text: `+${chair.perStep}/Step`, gradient: ['#ffffff', '#c9f0ff'] },
          { text: chair.name, size: 0.55 },
          status,
        ]}
        height={2.2}
        position={[-0.5, 4.6, 0]}
        billboard
        opts={OUTLINE}
      />
    </group>
  )
}

function Egg({ spot, egg, profile }) {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime + spot.x
    ref.current.position.y = 3.6 + Math.sin(t * 1.6) * 0.15
    ref.current.rotation.y = t * 0.6
  })
  const status = priceLine(egg.price, egg.reb, false, profile)
  const spots = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        const y = ((i * 37) % 10) / 10 - 0.5
        return [Math.cos(a) * 0.98, y * 1.2, Math.sin(a) * 0.98]
      }),
    [],
  )
  return (
    <group position={[spot.x, 0, spot.z + 2]}>
      <group ref={ref}>
        <mesh scale={[1.25, 1.6, 1.25]} castShadow>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color={egg.color} roughness={0.35} emissive={egg.color} emissiveIntensity={0.08} />
        </mesh>
        {spots.map((p, i) => (
          <mesh key={i} position={[p[0] * 1.2, p[1] * 1.4, p[2] * 1.2]} scale={0.22}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={egg.spots} />
          </mesh>
        ))}
      </group>
      <Label
        text={[{ text: egg.name, size: 0.7 }, status]}
        height={1.5}
        position={[0, 6.6, 0]}
        billboard
        opts={OUTLINE}
      />
    </group>
  )
}

const LB_STYLE = {
  level: { title: '📈 TOP LEVEL', color: '#25c93a', dark: '#0f6b1c', unit: 'Lv' },
  rebirths: { title: '🔄 TOP REBIRTHS', color: '#e0202f', dark: '#7a0d16', unit: 'Rebirths' },
  wins: { title: '🏆 TOP WINS', color: '#ffc21a', dark: '#8a5a00', unit: 'Wins' },
}

function Leaderboard({ spot, rows }) {
  const style = LB_STYLE[spot.kind]
  const texture = useMemo(() => {
    const W = 512
    const H = 600
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    g.fillStyle = style.dark
    g.fillRect(0, 0, W, H)
    g.font = `40px ${FONT}`
    g.textBaseline = 'middle'
    for (let i = 0; i < 10; i += 1) {
      const y = 34 + i * 58
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'
      g.fillRect(8, y - 27, W - 16, 54)
      const row = rows?.[i]
      g.fillStyle = i < 3 ? ['#ffd700', '#e0e0e0', '#ff9b4a'][i] : '#ffffff'
      g.textAlign = 'left'
      g.fillText(`${i + 1}`, 22, y)
      g.fillStyle = '#ffffff'
      const name = row ? row.name : '---'
      g.fillText(name.length > 14 ? `${name.slice(0, 13)}…` : name, 70, y)
      g.textAlign = 'right'
      g.fillStyle = '#ffe98a'
      g.fillText(row ? formatNum(row.value) : '', W - 22, y)
    }
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [rows, style])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[spot.x, 0, spot.z + 0.05]}>
      <mesh position={[0, 6.8, 0]}>
        <planeGeometry args={[9.6, 11.2]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <Label text={style.title} height={1.3} position={[0, 13.3, 0.1]} opts={OUTLINE} />
    </group>
  )
}

function DailyChest({ profile }) {
  const lid = useRef()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  const left = (profile?.daily?.last || 0) + DAILY_COOLDOWN_MS - now
  const ready = left <= 0
  useFrame((state) => {
    lid.current.rotation.x = ready ? -0.25 - Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.25 : 0
  })
  const h = Math.floor(left / 3600000)
  const m = Math.ceil((left % 3600000) / 60000)
  const { x, z } = LOBBY.daily
  return (
    <group position={[x, 0.8, z]}>
      <mesh position={[0, 1, 0]} material={studMaterial('#ffc21a')} castShadow>
        <boxGeometry args={[3.6, 2, 2.6]} />
      </mesh>
      <mesh position={[0, 1, 0.01]} material={studMaterial('#33b5ff')}>
        <boxGeometry args={[3.7, 0.5, 2.7]} />
      </mesh>
      <group ref={lid} position={[0, 2, -1.3]}>
        <mesh position={[0, 0.45, 1.3]} material={studMaterial('#ffc21a')} castShadow>
          <boxGeometry args={[3.7, 0.9, 2.7]} />
        </mesh>
      </group>
      <mesh position={[0, 1.6, 1.35]}>
        <boxGeometry args={[0.6, 0.8, 0.2]} />
        <meshStandardMaterial color="#ff8a00" />
      </mesh>
      <Label
        text={[
          { text: 'FREE REWARD', gradient: ['#b6ff6b', '#2bd92b'] },
          { text: ready ? 'Daily gift ready!' : `Next gift in ${h}h ${m}m`, size: 0.45, color: ready ? '#ffe14d' : '#ffffff' },
        ]}
        height={2.2}
        position={[0, 5.2, 0]}
        billboard
        opts={OUTLINE}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */

/** Soft additive light pool lying on the floor. */
function FloorGlow({ x, z, w, d, color, y = 0.16, base = 0.25, swing = 0.1, phase = 0 }) {
  const glow = useMemo(() => glowTexture(), [])
  const mat = useRef()
  useFrame((state) => {
    if (mat.current) mat.current.opacity = base + swing * Math.sin(state.clock.elapsedTime * 1.6 + phase)
  })
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial
        ref={mat}
        map={glow}
        color={color}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Coloured light pools over the zones, each egg and each chair display. */
function ZoneGlows() {
  return (
    <>
      <FloorGlow {...ZONES.chairs} w={ZONES.chairs.w + 8} d={ZONES.chairs.d + 8} color={ZONES.chairs.neon} base={0.16} swing={0.05} />
      <FloorGlow {...ZONES.eggs} w={ZONES.eggs.w + 8} d={ZONES.eggs.d + 8} color={ZONES.eggs.neon} base={0.18} swing={0.05} phase={1} />
      <FloorGlow {...ZONES.daily} w={ZONES.daily.w + 8} d={ZONES.daily.d + 8} color={ZONES.daily.neon} base={0.18} swing={0.06} phase={2} />
      <FloorGlow {...ZONES.plaza} w={ZONES.plaza.w + 10} d={ZONES.plaza.d + 10} color="#bcd0ff" base={0.22} swing={0.05} phase={3} />
      <FloorGlow {...ZONES.treadmill} w={ZONES.treadmill.w + 8} d={ZONES.treadmill.d + 8} color={ZONES.treadmill.neon} base={0.14} swing={0.04} phase={4} />
      {LOBBY.chairs.map((c, i) => (
        <FloorGlow key={c.id} x={c.x + 2.2} z={c.z} w={9} d={9} color={CHAIRS[i].color} y={0.17} base={0.42} swing={0.12} phase={i} />
      ))}
      {LOBBY.eggs.map((e, i) => (
        <FloorGlow key={e.id} x={e.x} z={e.z + 2} w={11} d={11} color={EGGS[i].color} y={0.17} base={0.45} swing={0.12} phase={i * 1.3} />
      ))}
    </>
  )
}

/** Chevrons that stream down the path towards the stage-1 gate. */
function GateChevrons() {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 128
    cv.height = 128
    const g = cv.getContext('2d')
    g.strokeStyle = '#9ff6ff'
    g.lineWidth = 14
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(24, 92)
    g.lineTo(64, 40)
    g.lineTo(104, 92)
    g.stroke()
    const t = new CanvasTexture(cv)
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.repeat.set(1, 6)
    return t
  }, [])
  useFrame((_s, dt) => {
    tex.offset.y -= dt * 0.35
  })
  const len = LOBBY_HALF - 4 // from the gate to the cross path
  return (
    <mesh position={[0, 0.1, -LOBBY_HALF + len / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[7, len]} />
      <meshBasicMaterial map={tex} transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

/** Sign on the gate crest plus the glow that pools in the doorway. */
function GateSign() {
  const stage = STAGES[1]
  return (
    <group>
      <Label
        text={[
          { text: 'STAGE 1', gradient: ['#ffffff', '#9ff6ff'] },
          { text: stage?.name || 'Escape!', size: 0.45, color: '#ffd84d' },
        ]}
        height={4.2}
        position={[0, GATE_H + 6, -LOBBY_HALF + 1.7]}
        opts={OUTLINE}
      />
      <FloorGlow x={0} z={-LOBBY_HALF + 4} w={GATE_W + 14} d={16} color="#33f5ff" y={0.12} base={0.3} swing={0.1} />
    </group>
  )
}

function AreaSign({ title, sub, position, rotation, color = '#ffffff' }) {
  return (
    <group position={position} rotation={rotation}>
      <Label text={title} height={2.6} opts={{ ...OUTLINE, gradient: ['#ffffff', '#e8e8e8'] }} />
      <Label text={sub} height={1.1} position={[0, -1.9, 0]} opts={{ ...OUTLINE, color }} />
    </group>
  )
}

/* ------------------------------------------------------------------ */

export const Lobby = memo(function Lobby({ boxes, visible = true }) {
  const profile = useGame((s) => s.profile)
  const lb = useGame((s) => s.lb)
  const star = useMemo(() => starTexture(), [])

  return (
    <>
      <BoxChunk boxes={boxes} visible={visible} />
      {visible && (
        <>
          <mesh position={[LOBBY_SPAWN.x, 0.12, LOBBY_SPAWN.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[7, 7]} />
            <meshBasicMaterial map={star} transparent />
          </mesh>

          {LOBBY.treadmills.map((spot, i) => (
            <Treadmill
              key={spot.id}
              spot={spot}
              def={TREADMILLS[i]}
              owned={profile?.treadmills?.includes(spot.id)}
              profile={profile}
            />
          ))}
          {LOBBY.chairs.map((spot, i) => (
            <ChairDisplay key={spot.id} spot={spot} chair={CHAIRS[i]} profile={profile} />
          ))}
          {LOBBY.eggs.map((spot, i) => (
            <Egg key={spot.id} spot={spot} egg={EGGS[i]} profile={profile} />
          ))}
          {LOBBY.leaderboards.map((spot) => (
            <Leaderboard key={spot.kind} spot={spot} rows={lb?.[spot.kind]} />
          ))}
          <DailyChest profile={profile} />
          <ZoneGlows />
          <GateChevrons />
          <GateSign />

          <AreaSign
            title="TREADMILLS"
            sub="Increase your speed automatically!"
            color="#ffb02e"
            position={[-LOBBY_HALF + 2.3, 12, 0]}
            rotation={[0, Math.PI / 2, 0]}
          />
          <AreaSign
            title="UPGRADES"
            sub="Upgrade your wheelchair!"
            color="#7dd8ff"
            position={[LOBBY_HALF - 2.3, 12, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          />
          <AreaSign
            title="PET EGGS"
            sub="Increase your speed with pets!"
            color="#ff6bf0"
            position={[0, 12, LOBBY_HALF - 2.3]}
            rotation={[0, Math.PI, 0]}
          />
          <AreaSign
            title="LEADERBOARDS"
            sub="Can you keep up with everyone else?"
            color="#7dff3a"
            position={[-29.5, 19, -LOBBY_HALF + 2.3]}
          />
        </>
      )}
    </>
  )
})

export default Lobby
