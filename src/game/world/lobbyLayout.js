import { CHAIRS, GATE_W, LOBBY, LOBBY_HALF, LOBBY_SPAWN, LOBBY_WALL } from '../../shared/gameData'

/**
 * Static lobby geometry, same box format as shared buildStage():
 * { x, y, z, w, h, d, color, kind: 'solid' | 'deco', neon? }
 * `neon` boxes render unlit so they read as glowing light strips.
 *
 * Z-fighting rule used throughout: two surfaces that face the same way never share a
 * plane. Floor layers are stacked at distinct heights and flat pieces butt against each
 * other instead of overlapping.
 */

/** Three wall colours (indigo body, violet panels, gold trim); neon is the accent. */
export const PAL = {
  wall: '#3b3796',
  panel: '#5c52d4',
  trim: '#ffcf3a',
  floor: '#b3b6f4',
  floorAlt: '#a3a6e3',
  path: '#4a9bff',
  pathEdge: '#1f66dc',
  pathDash: '#ffffff',
  trunk: '#a0684c',
  leaf: '#43e0a0',
  leaf2: '#2fc98e',
  leaf3: '#1fae7a',
}

export const WALL_TOP = 28
export const GATE_H = 16
const PILLAR_W = 3.4
const PILLAR_D = 2.2

/** Wall accent glow, per side. */
const NEON = { W: '#33f5ff', E: '#ffd84d', S: '#ff7ad9', N: '#b48cff' }

const T = LOBBY.treadmills
const C = LOBBY.chairs
const E = LOBBY.eggs
const tz0 = T[0].z
const tz1 = T[T.length - 1].z
const cz0 = C[0].z
const cz1 = C[C.length - 1].z
const ex0 = E[0].x
const ex1 = E[E.length - 1].x

/** Coloured floor zones: x/z centre, w along x, d along z. */
export const ZONES = {
  treadmill: { x: T[0].x - 0.25, z: (tz0 + tz1) / 2, w: 14.5, d: tz1 - tz0 + 9, rim: '#0b3fb8', top: '#1f9bff', neon: '#33f5ff' },
  chairs: { x: C[0].x + 1, z: (cz0 + cz1) / 2, w: 11, d: cz1 - cz0 + 9, rim: '#b57600', top: '#ffc21a', neon: '#ffe14d' },
  eggs: { x: (ex0 + ex1) / 2, z: 34.5, w: ex1 - ex0 + 12, d: 10, rim: '#b01a76', top: '#ff5fb8', neon: '#ff7ad9' },
  daily: { x: LOBBY.daily.x, z: LOBBY.daily.z, w: 11, d: 9, rim: '#1f66dc', top: '#4a9bff', neon: '#9fe9ff' },
  plaza: { x: LOBBY_SPAWN.x, z: LOBBY_SPAWN.z, w: 16, d: 14, rim: '#2b6cff', top: '#e9ecff', neon: '#ffffff' },
}

export function buildLobby() {
  const boxes = []
  const H = LOBBY_HALF
  const WT = LOBBY_WALL
  const gateHalf = GATE_W / 2
  const solid = (x, y, z, w, h, d, color, extra) => boxes.push({ x, y, z, w, h, d, color, kind: 'solid', ...extra })
  const deco = (x, y, z, w, h, d, color, extra) => boxes.push({ x, y, z, w, h, d, color, kind: 'deco', ...extra })
  const neon = (x, y, z, w, h, d, color) => boxes.push({ x, y, z, w, h, d, color, kind: 'deco', neon: true })
  /** A flat slab whose top sits at `top` (bottom is the floor). */
  const slab = (cx, cz, w, d, top, color, extra) => deco(cx, top / 2, cz, w, top, d, color, extra)

  // --- Floor -------------------------------------------------------------------------
  solid(0, -0.5, 0, H * 2, 1, H * 2, PAL.floor)

  const paths = []
  const path = (x0, x1, z0, z1) => paths.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 })
  const crossL = ZONES.treadmill.x + ZONES.treadmill.w / 2
  const crossR = ZONES.chairs.x - ZONES.chairs.w / 2
  const plazaN = ZONES.plaza.z - ZONES.plaza.d / 2
  const plazaS = ZONES.plaza.z + ZONES.plaza.d / 2
  const eggN = ZONES.eggs.z - ZONES.eggs.d / 2
  // Spawn -> gate, a cross to the side zones, and south to the eggs. Pieces only butt.
  path(-4.5, 4.5, -H, -1) // north (gate)
  path(crossL, crossR, -1, 7) // cross
  path(-4.5, 4.5, 7, plazaN)
  path(-4.5, 4.5, plazaS, eggN)
  for (const p of paths) slab(p.x, p.z, p.w, p.d, 0.05, PAL.path)
  // Darker kerb either side of the long north path (outside it, so nothing overlaps).
  slab(-4.9, (-H - 1) / 2, 0.8, H - 1, 0.05, PAL.pathEdge)
  slab(4.9, (-H - 1) / 2, 0.8, H - 1, 0.05, PAL.pathEdge)
  // White dashes down the middle, a hair above the path.
  for (let z = -H + 2; z < -4; z += 5) slab(0, z, 0.5, 2.4, 0.07, PAL.pathDash)
  for (let x = crossL + 3; x < crossR - 2; x += 5) slab(x, 3, 2.4, 0.5, 0.07, PAL.pathDash)

  // Soft checker on the bare floor (skips anything that already has its own surface).
  const cell = 7
  const occupied = [...Object.values(ZONES), ...paths]
  for (let i = 0; i < (H * 2) / cell; i += 1) {
    for (let j = 0; j < (H * 2) / cell; j += 1) {
      if ((i + j) % 2) continue
      const r = { x: -H + cell / 2 + i * cell, z: -H + cell / 2 + j * cell, w: cell, d: cell }
      // Only cells whose centre is already covered are skipped; the rest peek out from under
      // zones and paths (their tops are higher, so nothing shares a plane).
      if (occupied.some((o) => Math.abs(r.x - o.x) < o.w / 2 + 0.5 && Math.abs(r.z - o.z) < o.d / 2 + 0.5)) continue
      slab(r.x, r.z, cell, cell, 0.03, PAL.floorAlt)
    }
  }

  // --- Coloured zones: dark rim, bright top, glowing outline, corner lamps ------------
  const outline = (z, inset, dxExtra) => {
    const hw = z.w / 2 - inset
    const hd = z.d / 2 - inset
    neon(z.x, 0.065, z.z - hd, z.w - 2 * inset + dxExtra, 0.13, 0.3, z.neon)
    neon(z.x, 0.065, z.z + hd, z.w - 2 * inset + dxExtra, 0.13, 0.3, z.neon)
    neon(z.x - hw, 0.065, z.z, 0.3, 0.13, z.d - 2 * inset - dxExtra, z.neon)
    neon(z.x + hw, 0.065, z.z, 0.3, 0.13, z.d - 2 * inset - dxExtra, z.neon)
  }
  const zone = (z) => {
    slab(z.x, z.z, z.w, z.d, 0.06, z.rim)
    slab(z.x, z.z, z.w - 2, z.d - 2, 0.1, z.top)
    outline(z, 0.55, 0.3)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = z.x + sx * (z.w / 2 - 0.5)
        const lz = z.z + sz * (z.d / 2 - 0.5)
        solid(lx, 0.55, lz, 0.8, 1.1, 0.8, z.rim)
        neon(lx, 1.25, lz, 0.55, 0.5, 0.55, z.neon)
      }
    }
  }
  zone(ZONES.treadmill)
  zone(ZONES.chairs)
  zone(ZONES.eggs)
  zone(ZONES.daily)
  // Spawn plaza: same idea without lamps (you spawn here); star decal is drawn by Lobby.jsx.
  {
    const z = ZONES.plaza
    slab(z.x, z.z, z.w, z.d, 0.06, z.rim)
    slab(z.x, z.z, z.w - 2, z.d - 2, 0.09, z.top)
    outline(z, 0.55, 0.3)
  }

  // --- Walls: indigo body, violet pilasters, gold trim, one neon accent per side ------
  // Local wall frame: u runs along the wall, v is depth measured outward from the inner face
  // (negative = into the room). Boxes are mapped to world axes per side.
  const put = (side, u, y, v, len, h, depth, color, kind = 'deco', isNeon = false) => {
    const horiz = side === 'N' || side === 'S'
    const sgn = side === 'N' || side === 'W' ? -1 : 1
    const out = sgn * (H + v)
    boxes.push({
      x: horiz ? u : out,
      y,
      z: horiz ? out : u,
      w: horiz ? len : depth,
      h,
      d: horiz ? depth : len,
      color,
      kind,
      ...(isNeon ? { neon: true } : {}),
    })
  }

  for (const side of ['N', 'S', 'W', 'E']) {
    const accent = NEON[side]
    const full = side === 'W' || side === 'E'
    // W/E own the corners, so N/S details stop just short of them.
    const edge = full ? H : H - 0.9
    // N loses the middle where the gate is; its details also stop at the pillars.
    const spans =
      side === 'N'
        ? [
            [-edge, -(gateHalf + PILLAR_W)],
            [gateHalf + PILLAR_W, edge],
          ]
        : [[-edge, edge]]

    // Body.
    if (side === 'N') {
      for (const [a, b] of [
        [-H, -gateHalf],
        [gateHalf, H],
      ]) {
        put(side, (a + b) / 2, WALL_TOP / 2, WT / 2, b - a, WALL_TOP, WT, PAL.wall, 'solid')
      }
      // Lintel over the opening.
      put(side, 0, GATE_H + (WALL_TOP - GATE_H) / 2, WT / 2, GATE_W, WALL_TOP - GATE_H, WT, PAL.wall, 'solid')
    } else {
      const len = full ? H * 2 + 2 * WT : H * 2
      put(side, 0, WALL_TOP / 2, WT / 2, len, WALL_TOP, WT, PAL.wall, 'solid')
    }

    // Cap + battlements run the whole top.
    const capEdge = full ? H + WT : edge
    put(side, 0, WALL_TOP + 0.4, WT / 2 - 0.3, capEdge * 2, 0.8, WT + 1.2, PAL.trim)
    for (let u = -capEdge + 3; u <= capEdge - 3; u += 6) put(side, u, WALL_TOP + 1.6, 0.5, 3.2, 1.6, 2.2, PAL.panel)

    for (const [a, b] of spans) {
      const len = b - a
      const mid = (a + b) / 2
      put(side, mid, 0.7, -0.3, len, 1.4, 0.6, PAL.panel) // plinth
      put(side, mid, 7.2, -0.15, len, 0.3, 0.3, accent, 'deco', true) // neon band
      put(side, mid, 26.5, -0.4, len, 1.0, 0.8, PAL.trim) // gold trim under the battlements
    }

    // Pilasters: a violet column with a gold foot + cap and a neon tube down the front.
    for (let u = -35; u <= 35; u += 14) {
      if (side === 'N' && Math.abs(u) < gateHalf + PILLAR_W + 3) continue
      put(side, u, 0.6, -0.9, 4.8, 1.2, 1.8, PAL.trim)
      put(side, u, 14.2, -0.7, 4, 26.4, 1.4, PAL.panel)
      put(side, u, 27.9, -0.9, 4.8, 0.8, 1.8, PAL.trim)
      put(side, u, 14, -1.55, 0.5, 23, 0.2, accent, 'deco', true)
    }
  }

  // --- Stage-1 gate: gold + violet pillars, neon arch, tunnel through the wall --------
  {
    const zf = -H + PILLAR_D / 2 // front block sits in the room, butting the wall face
    const px = gateHalf + PILLAR_W / 2
    for (const s of [-1, 1]) {
      solid(s * px, (GATE_H + 3) / 2, zf, PILLAR_W, GATE_H + 3, PILLAR_D, PAL.trim)
      // Violet inlay on the pillar front (stands proud of it, never flush).
      deco(s * px, (GATE_H + 3) / 2, zf + PILLAR_D / 2 + 0.06, 1.4, GATE_H + 2, 0.12, PAL.panel)
      neon(s * (gateHalf - 0.12), GATE_H / 2, zf, 0.24, GATE_H, PILLAR_D - 0.2, '#33f5ff')
    }
    // Lintel and crest.
    solid(0, GATE_H + 1.5, zf, GATE_W + PILLAR_W * 2, 3, PILLAR_D, PAL.trim)
    solid(0, GATE_H + 6, -H + 0.8, GATE_W + PILLAR_W * 2 - 2, 6, 1.6, PAL.wall)
    deco(0, GATE_H + 9.15, -H + 0.8, GATE_W + PILLAR_W * 2 - 1, 0.3, 1.9, PAL.trim)
    neon(0, GATE_H - 0.15, zf, GATE_W, 0.3, PILLAR_D - 0.2, '#33f5ff')
    // Tunnel floor (the stage-1 room starts right after the wall).
    solid(0, -0.5, -H - WT / 2, GATE_W, 1, WT, '#2b6cff')
    for (const s of [-1, 1]) neon(s * (gateHalf - 0.6), 0.04, -H - WT / 2, 0.3, 0.08, WT, '#33f5ff')
  }

  // --- Trees: one style, mirrored. Planter box, stout trunk, three stacked leaf blocks -
  const tree = (x, z, s = 1) => {
    solid(x, 0.45, z, 3.8 * s, 0.9, 3.8 * s, PAL.panel)
    deco(x, 0.96, z, 3.4 * s, 0.12, 3.4 * s, PAL.trim)
    solid(x, 0.9 + 1.7 * s, z, 1.2 * s, 3.4 * s, 1.2 * s, PAL.trunk)
    deco(x, 0.9 + 3.4 * s + 0.9 * s, z, 5.4 * s, 1.8 * s, 5.4 * s, PAL.leaf)
    deco(x, 0.9 + 3.4 * s + 1.8 * s + 0.8 * s, z, 3.8 * s, 1.6 * s, 3.8 * s, PAL.leaf2)
    deco(x, 0.9 + 3.4 * s + 3.4 * s + 0.65 * s, z, 2.3 * s, 1.3 * s, 2.3 * s, PAL.leaf3)
  }
  for (const sx of [-1, 1]) {
    tree(sx * 37, 37, 1)
    tree(sx * 28.5, 38, 0.8)
    tree(sx * 39, 30, 0.8)
  }

  // --- Display furniture --------------------------------------------------------------
  // Chair pedestals (solid so you can't stand on the display) and egg stands.
  CHAIRS.forEach((_, i) => {
    const c = C[i]
    solid(c.x + 2.2, 0.5, c.z, 3.4, 1, 3.6, '#c6233a')
    neon(c.x + 2.2, 1.04, c.z, 3.0, 0.08, 3.2, '#ffe14d')
  })
  E.forEach((e) => solid(e.x, 0.6, e.z + 2, 4, 1.2, 4, '#2a2f3d'))

  // Leaderboard stands with a glowing frame around the live board.
  const lbColors = { level: '#25c93a', rebirths: '#e0202f', wins: '#ffc21a' }
  for (const b of LOBBY.leaderboards) {
    solid(b.x, 7, b.z - 0.5, 11, 14, 1, lbColors[b.kind])
    const fz = b.z + 0.15
    neon(b.x, 13.2, fz, 10.6, 0.3, 0.3, '#ffffff')
    neon(b.x, 0.6, fz, 10.6, 0.3, 0.3, '#ffffff')
    neon(b.x - 5.15, 6.9, fz, 0.3, 12.9, 0.3, '#ffffff')
    neon(b.x + 5.15, 6.9, fz, 0.3, 12.9, 0.3, '#ffffff')
  }

  // Daily reward chest base.
  solid(LOBBY.daily.x, 0.4, LOBBY.daily.z, 6, 0.8, 5, '#2b8cff')

  return boxes
}
