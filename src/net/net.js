import { Client } from 'colyseus.js'

import { play } from '../audio/sfx'
import { getSDK, safeCall } from '../bloxity/sdk'
import { getBloxityState } from '../bloxity/store'
import { GAME_ID, ROOM_NAME, formatNum } from '../shared/gameData'
import { runtime, useGame } from '../state/store'
import { createOfflineRoom } from './offline'

/**
 * Multiplayer connection.
 *
 * Production: ask the Bloxity matchmaker (play.bloxity.io) for a pod, then join the
 * "lobby" room there. Colyseus fills a lobby to 8 players; the 9th gets a fresh one.
 * Local dev: set VITE_SERVER_URL=ws://localhost:2567 to skip the matchmaker.
 *
 * If the server can't be reached the game switches to offline play (see offline.js): the
 * same rules run locally, so the lobby and stages stay playable. Messages from either
 * source go through the same `handlers` table below.
 */

const DIRECT_URL = import.meta.env.VITE_SERVER_URL || ''
const GAME = import.meta.env.VITE_GAME_ID || GAME_ID
const MATCHMAKER = import.meta.env.VITE_MATCHMAKER_URL || 'https://play.bloxity.io'

let room = null
let connecting = false
let pingTimer = null
let offline = null
let failures = 0

/** Give up on a server that doesn't answer instead of waiting on it forever. */
const CONNECT_TIMEOUT_MS = 8000
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('server not responding')), ms))])

function deviceId() {
  try {
    let id = localStorage.getItem('swce-device')
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^\w-]/g, '')
      localStorage.setItem('swce-device', id)
    }
    return id
  } catch {
    return `nostore-${Math.random().toString(36).slice(2, 14)}`
  }
}

async function resolveEndpoint() {
  if (DIRECT_URL) return DIRECT_URL
  const sdk = getSDK()
  if (sdk?.net?.resolveEndpoint) {
    const r = await sdk.net.resolveEndpoint(GAME, { matchmakerUrl: MATCHMAKER })
    return r.endpoint
  }
  const res = await fetch(`${MATCHMAKER}/v1/play/${encodeURIComponent(GAME)}`, { method: 'POST' })
  const { roomId } = await res.json()
  if (!roomId) throw new Error('matchmaker returned no room')
  return `${MATCHMAKER.replace(/^http/, 'ws')}/v1/ws/${roomId}`
}

function joinOptions() {
  const bx = getBloxityState()
  const sdk = getSDK()
  const identity = bx.user || bx.guest
  return {
    token: bx.user ? safeCall(sdk?.auth?.getToken?.bind(sdk.auth)) || undefined : undefined,
    deviceId: deviceId(),
    name: identity?.displayName || identity?.username || 'Guest',
    avatar: bx.equipped || identity?.avatar || null,
    proportions: bx.proportions || null,
  }
}

export async function connect() {
  if (connecting || room) return
  connecting = true
  const g = useGame.getState()
  useGame.setState({ net: g.profile ? 'reconnecting' : 'connecting', netError: null })
  try {
    const endpoint = await withTimeout(resolveEndpoint(), CONNECT_TIMEOUT_MS)
    const client = new Client(endpoint)
    room = await withTimeout(client.joinOrCreate(ROOM_NAME, joinOptions()), CONNECT_TIMEOUT_MS)
    failures = 0
    wire(room)
    safeCall(getSDK()?.game?.updateRoom, room.roomId)
  } catch (err) {
    console.error('[net] connect failed', err)
    room = null
    failures += 1
    // First try with no profile yet, or a second failed reconnect: carry on offline.
    if (failures >= (g.profile ? 2 : 1)) {
      startOffline()
    } else {
      useGame.setState({ net: 'error', netError: String(err?.message || err) })
      setTimeout(connect, 3000)
    }
  } finally {
    connecting = false
  }
}

export function send(type, payload) {
  if (offline) offline.send(type, payload)
  else if (room?.connection?.isOpen) room.send(type, payload)
}

function startOffline() {
  if (offline) return
  const bx = getBloxityState()
  const identity = bx.user || bx.guest
  const name = identity?.displayName || identity?.username || 'Guest'
  const carry = useGame.getState().profile
  clearInterval(pingTimer)
  offline = createOfflineRoom({
    name,
    existing: carry,
    dispatch: (type, msg) => handlers[type]?.(msg),
  })
  useGame.getState().toast('Server offline - playing offline. Progress is saved on this device.')
}

/** Re-sends the avatar after the Bloxity user logs in / changes cosmetics. */
export function reconnectWithNewIdentity() {
  if (!room) return
  const r = room
  room = null
  r.leave(true).finally(() => setTimeout(connect, 200))
}

function syncClock() {
  send('ping', { t: Date.now() })
}

/** Server -> client messages. Used for the live room and for the offline room alike. */
const handlers = {}
const set = (...a) => useGame.setState(...a)
const get = () => useGame.getState()
const on = (type, fn) => {
  handlers[type] = fn
}

function wire(r) {
  for (const [type, fn] of Object.entries(handlers)) r.onMessage(type, fn)
  r.onLeave((code) => {
    console.warn('[net] left room', code)
    clearInterval(pingTimer)
    if (room !== r) return
    room = null
    if (code === 4001) {
      set({ net: 'error', netError: 'You started playing somewhere else.' })
      return
    }
    set({ net: 'reconnecting' })
    setTimeout(connect, 1500)
  })
}

on('init', (m) => {
  set({ expedition: m.expedition || { tool: null, dug: {}, devStage: 0 } })
  runtime.pendingPush = null
  runtime.pushReadyAt = 0
  runtime.clockOffset = m.now - Date.now()
  runtime.remote.clear()
  const players = {}
  for (const p of m.players) {
    players[p.sid] = p
    runtime.remote.set(p.sid, { ...p.pos, tx: p.pos.x, ty: p.pos.y, tz: p.pos.z, tyaw: p.pos.yaw, flags: 0 })
  }
  runtime.pendingTeleport = m.spawn
  runtime.claimedGates.clear()
  set({ net: 'online', sid: m.sid, roomId: m.roomId, profile: m.profile, players, lb: m.lb, dev: m.dev })
  clearInterval(pingTimer)
  pingTimer = setInterval(syncClock, 10000)
  syncClock()
})

on('pong', (m) => {
  const rtt = Date.now() - m.t
  runtime.clockOffset = m.now + rtt / 2 - Date.now()
})

on('expedition', (expedition) => set({ expedition }))
on('push', (impulse) => { runtime.pendingPush = impulse; play('land') })
on('pushReady', ({ at }) => { runtime.pushReadyAt = at })
on('profile', (profile) => set({ profile }))
on('stats', (s) => {
  const p = get().profile
  if (p) set({ profile: { ...p, ...s } })
})
on('friends', (m) => set({ friends: m.count }))
on('lb', (lb) => set({ lb }))

on('join', (p) => {
  runtime.remote.set(p.sid, { ...p.pos, tx: p.pos.x, ty: p.pos.y, tz: p.pos.z, tyaw: p.pos.yaw, flags: 0 })
  set({ players: { ...get().players, [p.sid]: p } })
  get().toast(`${p.name} joined the lobby!`)
})
on('leave', ({ sid }) => {
  runtime.remote.delete(sid)
  const players = { ...get().players }
  delete players[sid]
  set({ players })
})
on('appearance', (a) => {
  const prev = get().players[a.sid]
  if (prev) set({ players: { ...get().players, [a.sid]: { ...prev, ...a } } })
})
on('snap', (snap) => {
  const mySid = get().sid
  for (const [sid, x, y, z, yaw, flags] of snap) {
    if (sid === mySid) continue
    const t = runtime.remote.get(sid)
    if (!t) continue
    t.tx = x
    t.ty = y
    t.tz = z
    t.tyaw = yaw
    t.flags = flags
  }
})

on('teleport', (pos) => {
  runtime.pendingPush = null;
  runtime.pendingTeleport = pos
})

on('gain', (g) => {
  if (g.src === 'gate') {
    get().showBig({ kind: 'speed', text: `+${formatNum(g.amount)}`, sub: 'Speed', ms: 1800 })
    play('gate')
  } else if (g.src === 'pack') {
    get().showBig({ kind: 'speed', text: `+${formatNum(g.amount)}`, sub: 'Speed', ms: 1600 })
    play('buy')
  } else {
    runtime.gains.push(g)
  }
})

on('levelUp', (lv) => {
  get().showLevelUp(lv)
  runtime.flashes.set('me', performance.now())
  play('levelUp')
})

on('fx', (fx) => {
  if (fx.kind === 'levelUp' || fx.kind === 'rebirth') {
    runtime.flashes.set(fx.sid || 'me', performance.now())
  }
  if (!fx.sid && fx.kind === 'rebirth') {
    play('rebirth')
    get().showBig({ kind: 'rebirth', text: `Rebirth ${fx.rebirths}!`, sub: 'Speed boost unlocked', ms: 2600 })
  }
})

on('reward', (m) => {
  play('win')
  if (m.kind === 'daily') {
    get().showBig({ kind: 'wins', text: `+${formatNum(m.wins)} Wins`, sub: `Daily gift - day ${m.streak}`, ms: 2400 })
  } else {
    get().showBig({
      kind: 'wins',
      text: `+${formatNum(m.wins)} Wins`,
      sub: m.bonus ? `Stage ${m.stage} BONUS cleared!` : `Stage ${m.stage} cleared!`,
      ms: 2400,
    })
    runtime.claimedGates.clear()
  }
})

on('hatch', (m) => set({ hatch: { ...m, at: performance.now() } }))
on('toast', (m) => {
  get().toast(m.text, m.kind)
  if (m.kind === 'error') play('error')
})
on('sfx', (m) => play(m.name))
