import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

import { play } from '../../audio/sfx'
import { formatNum } from '../../shared/gameData'
import { runtime } from '../../state/store'
import { textTexture } from '../textures'

const POOL = 18
const LIFE = 1.1

/**
 * "👟 +3" numbers that pop out of the local player as speed comes in, like the
 * original game. Reads payouts the server pushed into runtime.gains.
 */
export function SpeedPopups() {
  const sprites = useRef([])
  const slots = useMemo(() => Array.from({ length: POOL }, () => ({ age: LIFE, x: 0, y: 0, z: 0, vx: 0, s: 1 })), [])
  const next = useRef(0)

  useFrame((_s, dt) => {
    while (runtime.gains.length) {
      const g = runtime.gains.shift()
      const i = next.current
      next.current = (i + 1) % POOL
      const slot = slots[i]
      const me = runtime.me
      slot.age = 0
      slot.x = me.x + (Math.random() - 0.5) * 1.6
      slot.y = me.y + 1.2 + Math.random() * 0.6
      slot.z = me.z + (Math.random() - 0.5) * 1.6
      slot.vx = (Math.random() - 0.5) * 0.6
      const sprite = sprites.current[i]
      if (sprite) {
        const { texture, aspect } = textTexture(`👟+${formatNum(g.amount)}`, {
          size: 72,
          gradient: g.src === 'tread' ? ['#ffffff', '#9fe9ff'] : ['#ffffff', '#cfe8ff'],
        })
        sprite.material.map = texture
        sprite.material.needsUpdate = true
        slot.s = 0.75
        sprite.userData.aspect = aspect
      }
      play('step')
    }
    for (let i = 0; i < POOL; i += 1) {
      const slot = slots[i]
      const sprite = sprites.current[i]
      if (!sprite) continue
      slot.age += dt
      const k = slot.age / LIFE
      sprite.visible = k < 1
      if (k >= 1) continue
      const pop = k < 0.15 ? k / 0.15 : 1
      const h = slot.s * pop
      sprite.position.set(slot.x + slot.vx * k, slot.y + k * 1.6, slot.z)
      sprite.scale.set(h * (sprite.userData.aspect || 2), h, 1)
      sprite.material.opacity = 1 - Math.max(0, k - 0.6) / 0.4
    }
  })

  return slots.map((_, i) => (
    <sprite key={i} ref={(el) => (sprites.current[i] = el)} visible={false} renderOrder={10}>
      <spriteMaterial transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  ))
}

export default SpeedPopups
