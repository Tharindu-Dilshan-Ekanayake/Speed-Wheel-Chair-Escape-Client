import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, Fog } from 'three'

import { STAGE_COUNT } from '../../shared/gameData'
import { runtime, useGame } from '../../state/store'
import Lobby from './Lobby'
import Stage from './Stage'
import { world } from './worldData'

const LOBBY_SKY = '#33d1ff'

/**
 * Lobby + all stages. Colliders exist everywhere; meshes only for the region the
 * player is in and its neighbours.
 */
export function World() {
  const view = useGame((s) => s.viewStage)
  const W = world()
  return (
    <>
      <Lobby boxes={W.lobby} visible={view <= 1} />
      {W.stages.slice(1).map((stage) => {
        const k = stage.k
        const visible = Math.abs(k - Math.max(view, 1)) <= 1 || (view === 0 && k === 1)
        const near = Math.abs(k - view) <= 1 && view > 0
        return <Stage key={k} stage={stage} visible={visible} near={near || (view === 0 && k === 1)} />
      })}
      <SkyAndFog view={view} />
      <ColorLights view={view} />
      <SunFollow />
    </>
  )
}

/** Sky colour + fog follow the stage theme. */
function SkyAndFog({ view }) {
  const scene = useThree((s) => s.scene)
  const target = useRef(new Color(LOBBY_SKY))
  useEffect(() => {
    if (!scene.fog) scene.fog = new Fog(LOBBY_SKY, 160, 380)
    if (!scene.background) scene.background = new Color(LOBBY_SKY)
  }, [scene])
  useEffect(() => {
    const W = world()
    const sky = view === 0 ? LOBBY_SKY : W.stages[Math.min(view, STAGE_COUNT)].theme.sky
    target.current.set(sky)
  }, [view])
  useFrame((_s, dt) => {
    if (!scene.background) return
    scene.background.lerp(target.current, Math.min(1, dt * 2))
    scene.fog.color.copy(scene.background)
  })
  return null
}

const WHITE = new Color('#ffffff')
// Lobby mood: bright sky, lavender bounce from the floor, pink fill from the back.
const LOBBY_LIGHT = { sky: '#eaf8ff', ground: '#a99cff', fill: '#ff8fd6' }

/**
 * Soft coloured lighting: a sky/ground hemisphere plus a shadowless tinted fill from the
 * opposite side of the sun. Colours ease towards the current stage's palette so every
 * world has its own glow instead of one flat white light.
 */
function ColorLights({ view }) {
  const hemi = useRef()
  const fill = useRef()
  const target = useRef({ sky: new Color(LOBBY_LIGHT.sky), ground: new Color(LOBBY_LIGHT.ground), fill: new Color(LOBBY_LIGHT.fill) })
  useEffect(() => {
    const t = target.current
    if (view === 0) {
      t.sky.set(LOBBY_LIGHT.sky)
      t.ground.set(LOBBY_LIGHT.ground)
      t.fill.set(LOBBY_LIGHT.fill)
      return
    }
    const theme = world().stages[Math.min(view, STAGE_COUNT)].theme
    t.sky.set(theme.sky).lerp(WHITE, 0.55)
    t.ground.set(theme.floor).lerp(WHITE, 0.15)
    t.fill.set(theme.accent)
  }, [view])
  useFrame((_s, dt) => {
    const k = Math.min(1, dt * 2)
    hemi.current.color.lerp(target.current.sky, k)
    hemi.current.groundColor.lerp(target.current.ground, k)
    fill.current.color.lerp(target.current.fill, k)
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={[LOBBY_LIGHT.sky, LOBBY_LIGHT.ground, 0.9]} />
      <directionalLight ref={fill} position={[-30, 18, -24]} color={LOBBY_LIGHT.fill} intensity={0.32} />
    </>
  )
}

/** Keeps the shadow-casting sun centred on the player so shadows stay crisp. */
function SunFollow() {
  const light = useRef()
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const l = light.current
    scene.add(l.target)
    return () => scene.remove(l.target)
  }, [scene])
  useFrame(() => {
    const me = runtime.me
    light.current.position.set(me.x + 25, me.y + 45, me.z + 18)
    light.current.target.position.set(me.x, me.y, me.z)
  })
  return (
    <directionalLight
      ref={light}
      castShadow
      color="#fff1da"
      intensity={1.35}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-45}
      shadow-camera-right={45}
      shadow-camera-top={45}
      shadow-camera-bottom={-45}
      shadow-camera-near={1}
      shadow-camera-far={140}
      shadow-bias={-0.0008}
      shadow-normalBias={0.035}
    />
  )
}

export default World
