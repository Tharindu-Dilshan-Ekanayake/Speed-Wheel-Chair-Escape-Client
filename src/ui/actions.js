import { play } from '../audio/sfx'
import { send } from '../net/net'
import { SPEED_PACKS } from '../shared/gameData'

/** Left-side menu buttons and their hotkeys (shown in each button's top-left corner). */
export const MENU = [
  { id: 'rebirth', label: 'Rebirth', icon: '🔄', key: 'R', cls: 'bg-red' },
  { id: 'trails', label: 'Trails', icon: '✨', key: 'T', cls: 'bg-red' },
  { id: 'teleport', label: 'Teleport', icon: '🌀', key: 'P', cls: 'bg-purple' },
  { id: 'auras', label: 'Auras', icon: '🔥', key: 'U', cls: 'bg-green' },
  { id: 'inventory', label: 'Inventory', icon: '🎒', key: 'I', cls: 'bg-orange' },
  { id: 'daily', label: 'Daily', icon: '🎁', key: 'G', cls: 'bg-pink' },
]

export function buyX2() {
  play('click')
  send('x2')
}

export function buyPack(i) {
  const pack = SPEED_PACKS[i]
  if (!pack) return
  play('click')
  send('pack', { id: pack.id })
}
