import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

import { CORRIDOR_W, WALL_H, formatNum } from '../../shared/gameData'
import { runtime, useGame } from '../../state/store'
import { glowTexture, studMaterial } from '../textures'
import BoxChunk from './BoxChunk'
import Hazards from './Hazards'
import { Emoji, Label } from './Label'

const OUTLINE = { stroke: '#000', strokeWidth: 0.18 }

/** Lava river: a scrolling molten surface just above the kill volume, with a warm glow and rising embers. */
function LavaRiver({ river }) {
  const redStone = river.style === 'redStone'
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 256
    cv.height = 256
    const g = cv.getContext('2d')
    const toxic = river.kind === 'toxic'
    const pal = redStone
      ? ['#240707', '#8e1f1f', '#e03428', '#ff8b62']
      : toxic
        ? ['#0b3d12', '#e6ff6b', '#4dff3a', '#1fb52a']
        : ['#8a1500', '#ffe36b', '#ff9b1a', '#ff5a12']
    g.fillStyle = pal[0]
    g.fillRect(0, 0, 256, 256)
    // Tileable flow lines: sines whose period divides the canvas, so the edges match.
    for (let i = 0; i < 9; i += 1) {
      const y0 = (i / 9) * 256
      const amp = 8 + (i % 3) * 5
      const k = 1 + (i % 2)
      g.strokeStyle = pal[1 + (i % 3)]
      g.lineWidth = 7 + (i % 3) * 3
      g.lineCap = 'round'
      g.beginPath()
      for (let x = 0; x <= 256; x += 8) {
        const y = y0 + Math.sin((x / 256) * Math.PI * 2 * k + i) * amp
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    // Dark crust patches.
    g.fillStyle = 'rgba(40,6,0,0.55)'
    for (let i = 0; i < 14; i += 1) g.fillRect((i * 83) % 256, (i * 47) % 256, 22 + (i % 4) * 8, 10 + (i % 3) * 6)
    const t = new CanvasTexture(cv)
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.repeat.set(river.w / 12, river.d / 12)
    return t
  }, [redStone, river])
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
  useFrame((_s, dt) => {
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
    <group>
      <mesh position={[river.x, river.y, river.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[river.w, river.d]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[river.x, river.y + 0.08, river.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[river.w + 8, river.d + 8]} />
        <meshBasicMaterial map={glow} color={redStone ? '#ff3d24' : river.kind === 'toxic' ? '#5dff3a' : '#ff6a1a'} transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <points geometry={embers.geo} frustumCulled={false}>
        <pointsMaterial color={redStone ? '#ffb08a' : river.kind === 'toxic' ? '#b8ff6b' : '#ffb347'} size={0.3} transparent opacity={0.9} depthWrite={false} blending={AdditiveBlending} />
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
      pos[i * 3] = (Math.random() - 0.5) * CORRIDOR_W
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

/** Green glass pane in a grey stud frame, "+N Speed" written on it (like the original). */
function SpeedGate({ stage, gate }) {
  const pane = useRef()
  useFrame((state) => {
    const claimed = runtime.claimedGates.has(`${stage}:${gate.idx}`)
    pane.current.material.opacity = claimed ? 0.16 : 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.1
  })
  const W = gate.w
  const H = gate.secret ? 6 : 9
  const F = 0.9
  const frame = studMaterial('#c9d6ea')
  return (
    <group position={[gate.x, 0, gate.z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + F / 2), H / 2, 0]} material={frame} castShadow>
          <boxGeometry args={[F, H, F]} />
        </mesh>
      ))}
      <mesh position={[0, H + F / 2, 0]} material={frame} castShadow>
        <boxGeometry args={[W + 2 * F, F, F]} />
      </mesh>
      <mesh ref={pane} position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, 0.25]} />
        <meshStandardMaterial color="#2bff4f" emissive="#18c935" emissiveIntensity={0.7} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <Label
        text={[{ text: `+${formatNum(gate.amount)}` }, { text: 'Speed', size: 0.8 }]}
        height={H * 0.55}
        position={[0, H / 2, 0.2]}
        opts={OUTLINE}
      />
    </group>
  )
}

function GateBarrier({ barrier }) {
  const pane = useRef()
  useFrame((state) => {
    pane.current.material.opacity = 0.22 + Math.sin(state.clock.elapsedTime * 3) * 0.08
  })
  return (
    <group position={[barrier.x, barrier.h / 2, barrier.z]}>
      <mesh ref={pane}>
        <boxGeometry args={[barrier.w, barrier.h, 0.14]} />
        <meshStandardMaterial
          color={barrier.color}
          emissive={barrier.color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.26}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[barrier.w - 0.6, 0.16, 0.08]} />
        <meshBasicMaterial color={barrier.color} toneMapped={false} />
      </mesh>
    </group>
  )
}

function StageRoof({ stage }) {
  const length = stage.ceil.from - stage.ceil.to
  const lights = Array.from({ length: 7 }, (_, i) => stage.ceil.from - 8 - i * ((length - 16) / 6))
  return (
    <group>
      <mesh position={[0, WALL_H + 0.5, (stage.ceil.from + stage.ceil.to) / 2]} receiveShadow>
        <boxGeometry args={[CORRIDOR_W + 4, 1, length]} />
        <meshStandardMaterial color={stage.theme.wall} roughness={0.92} metalness={0.05} />
      </mesh>
      {lights.map((z) => (
        <group key={z} position={[0, WALL_H - 0.08, z]}>
          <mesh>
            <boxGeometry args={[10, 0.18, 1.1]} />
            <meshStandardMaterial color={stage.theme.accent} emissive={stage.theme.accent} emissiveIntensity={2.2} />
          </mesh>
          <pointLight color={stage.theme.accent} intensity={0.8} distance={24} decay={2} />
        </group>
      ))}
    </group>
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
      <meshBasicMaterial map={tex} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  )
}

function Pad({ pad }) {
  const wins = useGame((s) => s.profile?.wins ?? 0)
  const locked = wins < pad.minWins
  const color = locked ? '#5b6272' : pad.bonus ? '#ff1f2e' : '#ffe600'
  return (
    <group position={[pad.x, 0, pad.z]}>
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[pad.w, 0.18, pad.d]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={locked ? 0.05 : 0.35} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[pad.w + 0.5, 0.06, pad.d + 0.5]} />
        <meshStandardMaterial color="#222733" />
      </mesh>
      <Label
        text={locked ? `🔒 Need ${formatNum(pad.minWins)} Wins` : 'Press E'}
        height={0.9}
        position={[0, 4.6, 0]}
        billboard
        opts={{ ...OUTLINE, color: locked ? '#ff9b9b' : '#9ff6ff' }}
      />
      <Label
        text={`+${formatNum(pad.wins)} Wins${pad.bonus ? ' 2x' : ''}`}
        height={1.2}
        position={[-0.5, 3.5, 0]}
        billboard
        opts={{ ...OUTLINE, gradient: ['#fff6a0', '#ffc21a'] }}
      />
      <Emoji emoji="🏆" size={1.5} billboard position={[3, 3.5, 0]} />
    </group>
  )
}

function Sign({ s }) {
  switch (s.kind) {
    case 'title':
      return (
        <Label
          text={s.text}
          height={3.6}
          position={[s.x, s.y, s.z]}
          opts={{ ...OUTLINE, gradient: ['#ffffff', s.color] }}
        />
      )
    case 'sub':
      return <Label text={s.text} height={1.3} position={[s.x, s.y, s.z]} opts={OUTLINE} />
    case 'mascot':
      return (
        <group position={[s.x, s.y, s.z]}>
          {s.arrow && (
            <>
              <mesh position={[0, 0, -0.1]}>
                <boxGeometry args={[9, 3.2, 0.3]} />
                <meshStandardMaterial color="#ff1f2e" />
              </mesh>
              <mesh position={[5.4, 0, -0.1]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[2.6, 2.6, 3]} />
                <meshStandardMaterial color="#ff1f2e" />
              </mesh>
            </>
          )}
          <Emoji emoji={s.emoji} size={4.2} />
        </group>
      )
    case 'rec':
      return (
        <Label
          text={s.text}
          height={1.4}
          position={[s.x, s.y, s.z]}
          opts={{ stroke: null, strokeWidth: 0, bg: 'rgba(15,18,30,0.92)', size: 64 }}
        />
      )
    case 'safe':
      return (
        <group position={[s.x, s.y, s.z]}>
          <Label text="Safe Zone" height={2.6} opts={{ ...OUTLINE, color: '#5dff3a' }} />
          <Emoji emoji="😃" size={2.4} position={[0, -3, 0]} />
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
          opts={{ ...OUTLINE, bg: 'rgba(20,30,70,0.8)' }}
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
      <BoxChunk boxes={stage.boxes} visible={visible} />
      {visible && <StageRoof stage={stage} />}
      {near && (
        <>
          <Hazards hazards={stage.hazards} />
          {stage.gates.map((g) => (
            <SpeedGate key={g.idx} stage={stage.k} gate={g} />
          ))}
          {stage.barrier && <GateBarrier barrier={stage.barrier} />}
          {stage.rivers.map((r, i) => (
            <LavaRiver key={`r${i}`} river={r} />
          ))}
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
