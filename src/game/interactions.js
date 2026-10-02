import { play } from '../audio/sfx'
import { send } from '../net/net'
import {
  CHAIRS,
  DAILY_COOLDOWN_MS,
  EGGS,
  LOBBY,
  TREADMILLS,
  formatNum,
} from '../shared/gameData'
import { useGame } from '../state/store'

/**
 * Proximity prompts in the lobby ("E  Buy Blaze Chair"). Each spot knows how far it
 * reaches and what pressing E does for the current profile.
 */

function chairPrompt(chair, p) {
  if (p.chair === chair.id) return { title: chair.name, sub: 'Equipped', disabled: true }
  if (p.chairs.includes(chair.id)) return { title: chair.name, sub: 'Equip', action: () => send('chair', { id: chair.id }) }
  if (p.rebirths < chair.reb) return { title: chair.name, sub: `Needs ${chair.reb} rebirth${chair.reb > 1 ? 's' : ''}`, disabled: true }
  return { title: `Buy ${chair.name}`, sub: `🏆 ${formatNum(chair.price)}`, action: () => send('chair', { id: chair.id }) }
}

function treadPrompt(def, p) {
  if (p.treadmills.includes(def.id)) return null
  if (p.rebirths < def.reb) return { title: `${def.name} Treadmill`, sub: `Needs ${def.reb} rebirth${def.reb > 1 ? 's' : ''}`, disabled: true }
  return { title: `Unlock ${def.name} Treadmill`, sub: `🏆 ${formatNum(def.price)}`, action: () => send('treadmill', { id: def.id }) }
}

function eggPrompt(egg, p) {
  if (p.rebirths < egg.reb) return { title: egg.name, sub: `Needs ${egg.reb} rebirth${egg.reb > 1 ? 's' : ''}`, disabled: true }
  return {
    title: `Hatch ${egg.name}`,
    sub: `🏆 ${formatNum(egg.price)}`,
    action: () => {
      play('hatchShake')
      send('hatch', { id: egg.id })
    },
  }
}

export const SPOTS = [
  ...LOBBY.chairs.map((s, i) => ({ id: `chair-${s.id}`, x: s.x + 2.2, z: s.z, r: 4.2, get: (p) => chairPrompt(CHAIRS[i], p) })),
  ...LOBBY.treadmills.map((s, i) => ({ id: `tread-${s.id}`, x: s.x, z: s.z, r: 4.6, get: (p) => treadPrompt(TREADMILLS[i], p) })),
  ...LOBBY.eggs.map((s, i) => ({ id: `egg-${s.id}`, x: s.x, z: s.z + 2, r: 5, get: (p) => eggPrompt(EGGS[i], p) })),
  {
    id: 'daily',
    x: LOBBY.daily.x,
    z: LOBBY.daily.z,
    r: 5,
    get: (p) => {
      const left = (p.daily?.last || 0) + DAILY_COOLDOWN_MS - Date.now()
      if (left > 0) return { title: 'Daily Gift', sub: 'Open the gift calendar', action: () => useGame.getState().setPanel('daily') }
      return { title: 'FREE Rewards', sub: 'CLAIM!', action: () => send('daily') }
    },
  },
]

/** Finds the closest spot in reach; returns { id, prompt } or null. */
export function nearestSpot(x, z, profile) {
  if (!profile) return null
  let best = null
  let bestD = Infinity
  for (const s of SPOTS) {
    const d = Math.hypot(x - s.x, z - s.z)
    if (d < s.r && d < bestD) {
      const prompt = s.get(profile)
      if (prompt) {
        best = { id: s.id, prompt }
        bestD = d
      }
    }
  }
  return best
}
