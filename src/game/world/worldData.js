import { STAGE_COUNT, allStages, regionAtZ } from '../../shared/gameData'
import { buildLobby } from './lobbyLayout'

/**
 * Client-side world cache: the shared stage layouts plus derived lists the renderer
 * and the kill checks need.
 */

let cache = null

export function world() {
  if (cache) return cache
  const stages = allStages().map((s) =>
    s ? { ...s, killBoxes: s.boxes.filter((b) => b.kind === 'kill') } : null,
  )
  cache = { lobby: buildLobby(), stages }
  return cache
}

/** Which stage's geometry the player is standing in (0 = lobby). */
export function stageAt(z) {
  const r = regionAtZ(z)
  return Math.min(STAGE_COUNT, r.stage)
}
