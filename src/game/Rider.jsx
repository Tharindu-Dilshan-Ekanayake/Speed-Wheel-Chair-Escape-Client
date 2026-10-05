import { useFrame } from '@react-three/fiber'
import { Suspense, forwardRef, useRef } from 'react'

import { PlayerAura } from './effects/Aura'
import { ChairAura } from './effects/Aura'
import LevelUpFx from './effects/LevelUpFx'
import PlayerAvatar from './PlayerAvatar'
import Wheelchair, { SEAT_Y } from './Wheelchair'
import { Label } from './world/Label'
import { chairById } from '../shared/gameData'

/**
 * The visual of one player: wheelchair + seated Bloxity avatar + name tag + auras.
 * Origin is on the ground, facing +z. The parent rotates/positions it.
 */

/** Where the avatar's feet-origin sits so its hips land on the seat. Tuned by eye. */
const AVATAR_OFFSET = [0, SEAT_Y - 0.74, -0.06]
const AVATAR_HEIGHT = 1.85

const TAG_OPTS = { stroke: '#000', strokeWidth: 0.2, size: 64 }

export const Rider = forwardRef(function Rider(
  { name, chairId, auraId, motionRef, remote = false, showName = true, equipped, proportions, fxKey, onReady },
  ref,
) {
  const chair = chairById(chairId)
  const chairGroup = useRef()
  const avatarGroup = useRef()
  useFrame((_state, dt) => {
    const carrying = motionRef?.current?.carrying
    const t = Math.min(1, dt * 12)
    chairGroup.current.position.y += ((carrying ? 2.05 : 0) - chairGroup.current.position.y) * t
    chairGroup.current.rotation.z += ((carrying ? 0.14 : 0) - chairGroup.current.rotation.z) * t
    avatarGroup.current.position.y += ((carrying ? 0.06 : 0) - avatarGroup.current.position.y) * t
  })
  return (
    <group ref={ref}>
      <group ref={chairGroup}>
        <Wheelchair key={chairId} chairId={chairId} motion={motionRef} />
      </group>
      {chair?.aura && <ChairAura color={chair.aura} radius={0.95} />}
      <group ref={avatarGroup}><Suspense fallback={null}>
        <PlayerAvatar
          position={AVATAR_OFFSET}
          targetHeight={AVATAR_HEIGHT}
          motionRef={motionRef}
          remote={remote}
          equipped={equipped}
          proportions={proportions}
          onReady={onReady}
        />
      </Suspense></group>
      <PlayerAura auraId={auraId} />
      <LevelUpFx fxKey={fxKey} />
      {showName && <Label text={name || 'Player'} height={0.62} position={[0, 3.9, 0]} billboard opts={TAG_OPTS} />}
    </group>
  )
})

export default Rider
