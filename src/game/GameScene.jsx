import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { useBloxity } from '../bloxity/BloxityContext'
import { useGame } from '../state/store'
import SpeedPopups from './effects/SpeedPopups'
import FollowCamera from './FollowCamera'
import Player from './Player'
import RemotePlayers from './RemotePlayers'
import World from './world/World'

/**
 * Fires `onFirstFrame` after the renderer has actually drawn once.
 * `loadingEnd()` should mean "the player can see the game", not "React mounted".
 */
function FirstFrameSignal({ onFirstFrame }) {
  const fired = useRef(false)
  useFrame(() => {
    if (fired.current) return
    fired.current = true
    onFirstFrame()
  })
  return null
}

export function GameScene() {
  const { game } = useBloxity()
  const online = useGame((s) => s.net === 'online' || s.profile !== null)
  const playerBodyRef = useRef(null)

  const [avatarReady, setAvatarReady] = useState(false)
  const loadingEnded = useRef(false)

  const handleAvatarReady = useCallback(() => setAvatarReady(true), [])

  const endLoading = useCallback(() => {
    if (loadingEnded.current || !avatarReady) return
    loadingEnded.current = true
    game.loadingEnd()
  }, [avatarReady, game])

  useEffect(() => {
    endLoading()
  }, [endLoading])

  // Never leave the player stuck on the platform loading screen if the avatar CDN
  // is slow - the base body still renders.
  useEffect(() => {
    const id = setTimeout(() => setAvatarReady(true), 12000)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    game.loadingStep('Building the world…')
  }, [game])

  return (
    <Canvas
      shadows
      flat
      dpr={[1, 1.75]}
      camera={{ position: [0, 8, 34], fov: 65, near: 0.2, far: 400 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.35} />

      <Suspense fallback={null}>
        <Physics gravity={[0, -24, 0]} timeStep="vary">
          <World />
          {online && <Player bodyRef={playerBodyRef} onAvatarReady={handleAvatarReady} />}
        </Physics>
        <RemotePlayers />
        <SpeedPopups />
      </Suspense>

      <FollowCamera bodyRef={playerBodyRef} />
      <FirstFrameSignal onFirstFrame={endLoading} />
    </Canvas>
  )
}

export default GameScene
