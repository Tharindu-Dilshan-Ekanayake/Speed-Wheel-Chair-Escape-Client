import { Suspense, forwardRef } from 'react'

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
  { name, level, chairId, auraId, motionRef, remote = false, equipped, proportions, fxKey, onReady },
  ref,
) {
  const chair = chairById(chairId)
  return (
    <group ref={ref}>
      <Wheelchair key={chairId} chairId={chairId} motion={motionRef} />
      {chair?.aura && <ChairAura color={chair.aura} radius={0.95} />}
      <Suspense fallback={null}>
        <PlayerAvatar
          position={AVATAR_OFFSET}
          targetHeight={AVATAR_HEIGHT}
          motionRef={motionRef}
          remote={remote}
          equipped={equipped}
          proportions={proportions}
          onReady={onReady}
        />
      </Suspense>
      <PlayerAura auraId={auraId} />
      <LevelUpFx fxKey={fxKey} />
      <Label
        text={[{ text: name || 'Player' }, { text: `Level: ${level ?? 1}`, color: '#5dff3a', size: 0.85 }]}
        height={0.62}
        position={[0, 2.85, 0]}
        billboard
        opts={TAG_OPTS}
      />
    </group>
  )
})

export default Rider
