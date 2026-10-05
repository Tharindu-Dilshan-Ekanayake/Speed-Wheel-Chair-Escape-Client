import {
  fallingState,
  grannyPos,
  lavaBallPos,
  tornadoPos,
  tideLevel,
  laserOn,
  pendulumX,
  pusherX,
  rollerPos,
  sweeperAngle,
  wavePos,
} from '../shared/gameData'

/** Player hit volume, relative to the capsule centre. */
const R = 0.42
const FEET = 1.0
const TALL = 1.7

/**
 * Does the player at capsule-centre (x, y, z) touch anything deadly in `stage`
 * at server time `t`? Returns a short cause string, or null.
 */
export function checkKill(stage, x, y, z, t) {
  if (!stage) return null
  const feet = y - FEET
  const head = feet + TALL

  for (const b of stage.killBoxes) {
    if (
      Math.abs(x - b.x) <= b.w / 2 + R &&
      Math.abs(z - b.z) <= b.d / 2 + R &&
      feet <= b.y + b.h / 2 + 0.05 &&
      head >= b.y - b.h / 2
    ) {
      return b.cause || 'lava'
    }
  }

  for (const h of stage.hazards) {
    switch (h.type) {
      case 'spike': {
        if (feet < (h.y || 0) + h.h * 0.75 && Math.hypot(x - h.x, z - h.z) < h.r * 0.7 + R) return 'spike'
        break
      }
      case 'roller': {
        const p = rollerPos(h, t)
        if (Math.hypot(x - p.x, feet + 0.8 - p.y, z - p.z) < h.r + 0.5) return 'roller'
        break
      }
      case 'wave': {
        const w = wavePos(h, t)
        if (w && (h.axis === 'x' ? Math.abs(x - w.x) < 2.4 && Math.abs(z - w.z) < h.half : Math.abs(z - w.z) < 2.4 && Math.abs(x - w.x) < h.half) && feet < 9) {
          const sheltered = h.shelters.some((sh) => Math.abs(x - sh.x) < sh.w / 2 && Math.abs(z - sh.z) < sh.d / 2)
          if (!sheltered) return 'wave'
        }
        break
      }
      case 'sweeper': {
        const a = sweeperAngle(h, t)
        const dx = x - h.x
        const dz = z - h.z
        const perp = Math.abs(dx * Math.sin(a) - dz * Math.cos(a))
        if (perp < 0.35 + R && Math.hypot(dx, dz) < h.len + 0.4 && feet < h.y + 0.3 && head > h.y - 0.3) {
          return 'sweeper'
        }
        break
      }
      case 'pusher': {
        const px = pusherX(h, t)
        if (Math.abs(x - px) < h.w / 2 + R && Math.abs(z - h.z) < h.d / 2 + R && feet < h.h) return 'pusher'
        break
      }
      case 'falling': {
        const s = fallingState(h, t)
        const half = h.size / 2
        if (
          Math.abs(x - h.x) < half + R &&
          Math.abs(z - h.z) < half + R &&
          feet < s.y + half &&
          head > s.y - half
        ) {
          return 'falling'
        }
        break
      }
      case 'pendulum': {
        const px = pendulumX(h, t)
        const cy = h.h / 2 + 0.3
        if (
          Math.abs(x - px) < h.w / 2 + R &&
          Math.abs(z - h.z) < h.d / 2 + R &&
          feet < cy + h.h / 2 &&
          head > cy - h.h / 2
        ) {
          return 'pendulum'
        }
        break
      }
      case 'tide': {
        const level = tideLevel(h, t).level
        if (Math.abs(x - h.x) < h.w / 2 + R && Math.abs(z - h.z) < h.d / 2 + R && feet < level) return h.cause || 'lava'
        break
      }
      case 'granny': {
        const g = grannyPos(h, t)
        if (feet < 2.6 && Math.hypot(x - g.x, z - g.z) < h.r + R) return 'granny'
        break
      }
      case 'boulder': {
        const p = rollerPos(h, t)
        if (feet < h.r * 1.6 && Math.hypot(x - p.x, z - p.z) < h.kr) return 'lava'
        break
      }
      case 'tornado': {
        const p = tornadoPos(h, t)
        if (feet < h.h && Math.hypot(x - p.x, z - p.z) < h.r * 0.75 + R) {
          const sheltered = h.shelters?.some((sh) => Math.abs(x - sh.x) < sh.w / 2 && Math.abs(z - sh.z) < sh.d / 2)
          if (!sheltered) return 'tornado'
        }
        break
      }
      case 'lavaBall': {
        const p = lavaBallPos(h, t)
        if (p && Math.hypot(x - p.x, feet + 0.8 - p.y, z - h.z) < h.r + 0.5) return 'lava'
        break
      }
      case 'laser': {
        if (laserOn(h, t) && Math.abs(z - h.z) < 0.35 + R && Math.abs(x - (h.x || 0)) < h.half && feet < h.y + 0.08 && head > h.y) {
          return 'laser'
        }
        break
      }
      default:
    }
  }
  return null
}
