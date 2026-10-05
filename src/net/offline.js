import {
  AURAS,
  CHAIRS,
  DAILY_COOLDOWN_MS,
  DAILY_REWARDS,
  DAILY_STREAK_RESET_MS,
  DEV_TOOLS,
  EGGS,
  LOBBY,
  LOBBY_SPAWN,
  MAX_LEVEL,
  MAX_PETS,
  PETS,
  BONUS_PAD_MIN_REBIRTHS,
  REBIRTH_SPEED_BONUS,
  REBIRTH_WIN_BONUS,
  SPEED_PACKS,
  STAGES,
  STAGE_COUNT,
  STEP_DISTANCE,
  TRAILS,
  TREADMILLS,
  TREADMILL_STEPS_PER_SEC,
  X2_BOOST,
  newExpedition, expeditionAction, excavationComplete, blockedExcavation, stageAccess, stageStartZ,
  allStages,
  chairById,
  inPad,
  maxWalkSpeed,
  onTreadmill,
  petSlots,
  regionAtZ,
  speedMultiplier,
  stageCenterX,
  stageSpawn,
  xpForLevel,
} from '../shared/gameData'

/**
 * Offline play: the same rules the Colyseus server runs (speed from steps, treadmills,
 * chairs, eggs, daily gift, stage gates and wins pads), executed in the browser so the
 * lobby and every stage stay playable when the server is down. Progress is kept in
 * localStorage. It speaks the exact messages the server does, so the rest of the client
 * can't tell the difference.
 *
 * Mirrors Speed-Wheel-Chair-Escape-Server/src/profile.js + LobbyRoom.js - keep the two in
 * step when the economy rules change.
 */

const KEY = 'swce-offline-profile'
const TICK_MS = 100
const GAIN_FLUSH_MS = 300

const fail = (error) => ({ ok: false, error })

function newProfile(name) {
  const now = Date.now()
  return {
    name,
    level: 1,
    xp: 0,
    speed: 0,
    totalSpeed: 0,
    wins: 0,
    rebirths: 0,
    totalLevel: 1,
    chair: 'classic',
    chairs: ['classic'],
    treadmills: ['t1'],
    pets: [],
    equippedPets: [],
    trail: 'none',
    trails: ['none'],
    aura: 'none',
    auras: ['none'],
    customSpeed: 0,
    maxStage: 1,
    stagesCleared: 0,
    daily: { last: 0, streak: 0 },
    boostUntil: 0,
    createdAt: now,
    updatedAt: now,
  }
}

function loadProfile(name) {
  const base = newProfile(name)
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const out = { ...base, ...JSON.parse(raw), name }
      for (const k of ['chairs', 'treadmills', 'pets', 'equippedPets', 'trails', 'auras']) {
        if (!Array.isArray(out[k])) out[k] = base[k]
      }
      if (!out.daily || typeof out.daily !== 'object') out.daily = base.daily
      return out
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return base
}

function pay(p, price, reb = 0) {
  if ((p.rebirths || 0) < reb) return fail(`Needs ${reb} rebirth${reb === 1 ? '' : 's'}!`)
  if (p.wins < price) return fail('Not enough wins!')
  p.wins -= price
  return { ok: true }
}

function addSpeed(p, amount) {
  amount = Math.max(0, Math.floor(amount))
  if (!amount) return null
  p.speed += amount
  p.totalSpeed += amount
  const before = { level: p.level, walk: maxWalkSpeed(p) }
  p.xp += amount
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level)
    p.level += 1
  }
  if (p.level >= MAX_LEVEL) p.xp = Math.min(p.xp, xpForLevel(MAX_LEVEL))
  p.totalLevel = p.rebirths * MAX_LEVEL + p.level
  if (p.level !== before.level) return { from: before.level, to: p.level, walkFrom: before.walk, walkTo: maxWalkSpeed(p) }
  return null
}

function rollPet(egg) {
  const total = egg.pets.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * total
  for (const [type, w] of egg.pets) {
    roll -= w
    if (roll <= 0) return type
  }
  return egg.pets[0][0]
}

/**
 * @param {{ name: string, dispatch: (type: string, msg: any) => void }} opts
 *   `dispatch` delivers a "server" message to the client's normal message handlers.
 * @param {object} [existing] a live profile to carry on with (e.g. the server dropped mid-game)
 */
export function createOfflineRoom({ name, dispatch, existing = null }) {
  const profile = existing ? { ...existing } : loadProfile(name)
  const stages = allStages()
  const p = {
    profile,
    pos: { x: LOBBY_SPAWN.x, y: LOBBY_SPAWN.y, z: LOBBY_SPAWN.z, yaw: LOBBY_SPAWN.yaw },
    flags: 0,
    distAcc: 0,
    pendingGain: 0,
    pendingSrc: 'step',
    expedition: newExpedition(),
    run: { stage: 0, enteredAt: 0, gates: new Set(), claimed: false },
  }
  let dirty = true
  let lastSave = 0

  const privateProfile = () => ({ ...profile, maxWalk: maxWalkSpeed(profile) })
  const error = (text) => dispatch('toast', { text, kind: 'error' })
  const changed = () => {
    dirty = true
    dispatch('profile', privateProfile())
  }
  const result = (r, sfx = null) => {
    if (!r.ok) return error(r.error)
    if (sfx) dispatch('sfx', { name: sfx })
    changed()
  }
  const save = () => {
    if (!dirty) return
    dirty = false
    lastSave = Date.now()
    profile.updatedAt = lastSave
    try {
      localStorage.setItem(KEY, JSON.stringify(profile))
    } catch {
      /* storage blocked: progress only lasts this session */
    }
  }
  const giveSpeed = (amount, src) => {
    const lv = addSpeed(profile, amount)
    dispatch('gain', { amount: Math.floor(amount), src })
    if (lv) {
      dispatch('levelUp', lv)
      changed()
    } else {
      dirty = true
    }
  }
  const setPos = (spawn) => {
    p.pos = { x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw ?? Math.PI }
    if (regionAtZ(spawn.z).stage === 0) {
      p.expedition = newExpedition()
      dispatch('expedition', p.expedition)
    }
    dispatch('teleport', p.pos)
  }
  const resetRun = () => {
    p.run = { stage: 0, enteredAt: 0, gates: new Set(), claimed: false }
  }

  const handlers = {
    expedition: (m) => {
      const issue = expeditionAction(p.expedition, p.pos, m.action, m.id)
      if (issue) return error(issue)
      dispatch('expedition', { ...p.expedition, dug: { ...p.expedition.dug } })
    },
    dev: (m) => {
      if (!DEV_TOOLS) return
      switch (m.action) {
        case 'tp': {
          const stage = Math.max(0, Math.min(STAGE_COUNT, Math.floor(Number(m.stage) || 0)))
          p.expedition = newExpedition(stage)
          if (stages[stage]?.digSites.length) p.expedition.tool = 'pickaxe'
          dispatch('expedition', p.expedition)
          profile.maxStage = Math.max(profile.maxStage, stage)
          resetRun()
          setPos(stageSpawn(stage))
          break
        }
        case 'wins': profile.wins += Math.max(0, Math.min(1e7, Number(m.amount) || 0)); break
        case 'level': giveSpeed(1e9, 'pack'); break
        case 'rebirths': profile.rebirths += 1; profile.totalLevel = profile.rebirths * MAX_LEVEL + profile.level; break
        case 'reset': Object.assign(profile, newProfile(profile.name)); resetRun(); setPos(LOBBY_SPAWN); break
        default: return
      }
      changed()
    },
    ping: (m) => dispatch('pong', { t: m.t, now: Date.now() }),

    pos: (m) => {
      if (!Array.isArray(m) || m.length < 5) return
      const [x, y, z, yaw, flags] = m.map(Number)
      if (![x, y, z, yaw].every(Number.isFinite)) return
      const dist = Math.hypot(x - p.pos.x, z - p.pos.z)
      const destination = regionAtZ(z)
      const denied = destination.inCourse && p.expedition.devStage !== destination.stage && stageAccess(profile, destination.stage)
      if (denied) {
        error(denied)
        return setPos({ x: stageCenterX(destination.stage), y: 1.5, z: stageStartZ(destination.stage) + 4, yaw: Math.PI })
      }
      if (blockedExcavation(p.expedition, { x, y, z })) return setPos(p.pos)
      p.pos = { x, y, z, yaw }
      p.flags = flags | 0
      if ((p.flags & 2) !== 0 && dist > 0.01 && dist < 50) {
        p.distAcc += dist
        if (p.distAcc >= STEP_DISTANCE) {
          const steps = Math.floor(p.distAcc / STEP_DISTANCE)
          p.distAcc -= steps * STEP_DISTANCE
          p.pendingGain += steps * chairById(profile.chair).perStep * speedMultiplier(profile)
          p.pendingSrc = 'step'
        }
      }
      const region = regionAtZ(z)
      if (region.stage === 0) {
        if (p.run.stage !== 0) resetRun()
      } else if (region.inCourse && p.run.stage !== region.stage) {
        p.run = { stage: region.stage, enteredAt: Date.now(), gates: new Set(), claimed: false }
        if (region.stage > profile.maxStage) {
          profile.maxStage = region.stage
          changed()
        }
      }
    },

    respawn: () => {
      resetRun()
      setPos(LOBBY_SPAWN)
    },

    teleport: (m) => {
      const stage = Number(m.stage) || 0
      if (stage <= 0) {
        resetRun()
        return setPos(LOBBY_SPAWN)
      }
      if (stage > STAGE_COUNT) return undefined
      if (stage > profile.maxStage) return error(`Reach stage ${stage} first!`)
      const denied = stageAccess(profile, stage)
      if (denied) return error(denied)
      p.expedition.devStage = 0
      dispatch('expedition', { ...p.expedition })
      const cost = STAGES[stage].tp
      if (profile.wins < cost) return error('Not enough wins!')
      profile.wins -= cost
      changed()
      dispatch('sfx', { name: 'teleport' })
      const rack = stages[stage - 1]?.toolRack
      return setPos(rack && !p.expedition.tool ? { x: rack.x, y: 1.5, z: rack.z + 2, yaw: Math.PI } : stageSpawn(stage))
    },

    gate: (m) => {
      const stage = Number(m.stage)
      if (!excavationComplete(p.expedition, stage) || (p.expedition.devStage !== stage && stageAccess(profile, stage))) return
      const idx = Number(m.idx)
      if (p.run.stage !== stage || p.run.gates.has(idx)) return
      const gate = stages[stage]?.gates[idx]
      if (!gate) return
      if (Math.hypot(p.pos.x - gate.x, p.pos.z - gate.z) > (gate.w || 10) / 2 + 5) return
      p.run.gates.add(idx)
      giveSpeed(gate.amount * (1 + profile.rebirths * REBIRTH_SPEED_BONUS), 'gate')
      changed()
    },

    claimReturn: (m) => {
      const stage = Number(m.stage)
      if (!excavationComplete(p.expedition, stage) || (p.expedition.devStage !== stage && stageAccess(profile, stage))) return
      const bonus = Boolean(m.bonus)
      const st = stages[stage]
      if (!st || p.run.claimed) return error('This wins pad is not ready yet.')
      const region = regionAtZ(p.pos.z)
      if (region.stage !== stage || !region.inSafe) return error('Move onto the safe-room wins pad.')
      const pad = bonus ? st.bonusPad : st.returnPad
      if (!inPad(pad, p.pos.x, p.pos.z, 1.5)) return error('Stand on the wins pad and press E.')
      if (bonus && profile.rebirths < BONUS_PAD_MIN_REBIRTHS) return error(`Need ${BONUS_PAD_MIN_REBIRTHS} rebirths to unlock this pad!`)
      p.run.claimed = true
      const wins = Math.round(pad.wins * (1 + profile.rebirths * REBIRTH_WIN_BONUS))
      profile.wins += wins
      profile.stagesCleared += 1
      if (stage + 1 <= STAGE_COUNT && stage + 1 > profile.maxStage) profile.maxStage = stage + 1
      dispatch('reward', { wins, kind: 'stage', stage, bonus })
      changed()
      resetRun()
      setPos(LOBBY_SPAWN)
    },

    rebirth: () => {
      if (profile.level < MAX_LEVEL) return error(`Reach level ${MAX_LEVEL} to rebirth!`)
      profile.rebirths += 1
      profile.level = 1
      profile.xp = 0
      profile.speed = 0
      profile.customSpeed = 0
      profile.totalLevel = profile.rebirths * MAX_LEVEL + 1
      dispatch('fx', { kind: 'rebirth', rebirths: profile.rebirths })
      return changed()
    },

    chair: (m) => {
      const c = CHAIRS.find((x) => x.id === String(m.id))
      if (!c) return error('Unknown chair')
      if (!profile.chairs.includes(c.id)) {
        const r = pay(profile, c.price, c.reb)
        if (!r.ok) return error(r.error)
        profile.chairs.push(c.id)
      }
      profile.chair = c.id
      return result({ ok: true }, 'chair')
    },

    treadmill: (m) => {
      const t = TREADMILLS.find((x) => x.id === String(m.id))
      if (!t) return error('Unknown treadmill')
      if (profile.treadmills.includes(t.id)) return error('Already owned')
      const r = pay(profile, t.price, t.reb)
      if (!r.ok) return error(r.error)
      profile.treadmills.push(t.id)
      return result({ ok: true }, 'buy')
    },

    hatch: (m) => {
      const egg = EGGS.find((e) => e.id === String(m.id))
      if (!egg) return error('Unknown egg')
      if (profile.pets.length >= MAX_PETS) return error('Pet inventory full! Delete some pets.')
      const r = pay(profile, egg.price, egg.reb)
      if (!r.ok) return error(r.error)
      const pet = { uid: Math.random().toString(16).slice(2, 12), type: rollPet(egg) }
      profile.pets.push(pet)
      if (profile.equippedPets.length < petSlots(profile.rebirths)) profile.equippedPets.push(pet.uid)
      dispatch('hatch', { egg: egg.id, pet })
      return changed()
    },

    equipPet: (m) => {
      const uid = String(m.uid)
      if (!profile.pets.some((x) => x.uid === uid)) return error('Unknown pet')
      const i = profile.equippedPets.indexOf(uid)
      if (m.on) {
        if (i < 0) {
          if (profile.equippedPets.length >= petSlots(profile.rebirths)) return error('All pet slots are full!')
          profile.equippedPets.push(uid)
        }
      } else if (i >= 0) {
        profile.equippedPets.splice(i, 1)
      }
      return changed()
    },

    equipBest: () => {
      const sorted = [...profile.pets].sort((a, b) => (PETS[b.type]?.mult || 0) - (PETS[a.type]?.mult || 0))
      profile.equippedPets = sorted.slice(0, petSlots(profile.rebirths)).map((x) => x.uid)
      return changed()
    },

    deletePet: (m) => {
      const i = profile.pets.findIndex((x) => x.uid === String(m.uid))
      if (i < 0) return error('Unknown pet')
      const [gone] = profile.pets.splice(i, 1)
      profile.equippedPets = profile.equippedPets.filter((x) => x !== gone.uid)
      return changed()
    },

    cosmetic: (m) => {
      const list = m.kind === 'trail' ? TRAILS : m.kind === 'aura' ? AURAS : null
      const item = list?.find((x) => x.id === String(m.id))
      if (!item) return error('Unknown item')
      const owned = m.kind === 'trail' ? profile.trails : profile.auras
      if (!owned.includes(item.id)) {
        const r = pay(profile, item.price, item.reb)
        if (!r.ok) return error(r.error)
        owned.push(item.id)
      }
      profile[m.kind] = item.id
      return result({ ok: true }, 'buy')
    },

    daily: () => {
      const now = Date.now()
      const since = now - (profile.daily.last || 0)
      if (since < DAILY_COOLDOWN_MS) return error('Come back later for your next gift!')
      const streak = since > DAILY_STREAK_RESET_MS ? 1 : (profile.daily.streak % DAILY_REWARDS.length) + 1
      const wins = DAILY_REWARDS[streak - 1]
      profile.daily = { last: now, streak }
      profile.wins += wins
      dispatch('reward', { wins, kind: 'daily', streak })
      return changed()
    },

    x2: () => {
      const r = pay(profile, X2_BOOST.price)
      if (!r.ok) return error(r.error)
      profile.boostUntil = Math.max(Date.now(), profile.boostUntil || 0) + X2_BOOST.minutes * 60 * 1000
      return result({ ok: true }, 'buy')
    },

    pack: (m) => {
      const pack = SPEED_PACKS.find((x) => x.id === m.id)
      if (!pack) return
      if (profile.wins < pack.price) return error('Not enough wins!')
      profile.wins -= pack.price
      giveSpeed(pack.amount, 'pack')
      changed()
    },

    customSpeed: (m) => {
      const v = Math.floor(Number(m.value) || 0)
      profile.customSpeed = v <= 0 ? 0 : Math.min(v, maxWalkSpeed(profile))
      return changed()
    },
  }

  let last = Date.now()
  let gainTimer = 0
  const timer = setInterval(() => {
    const now = Date.now()
    const dtMs = now - last
    last = now

    // Treadmills: sit on an owned one and speed flows in.
    if (p.run.stage === 0 && p.pos.y < 4) {
      for (const t of LOBBY.treadmills) {
        if (!onTreadmill(t, p.pos.x, p.pos.z)) continue
        if (!profile.treadmills.includes(t.id)) break
        const def = TREADMILLS.find((x) => x.id === t.id)
        p.pendingGain += chairById(profile.chair).perStep * TREADMILL_STEPS_PER_SEC * def.mult * speedMultiplier(profile) * (dtMs / 1000)
        p.pendingSrc = 'tread'
        break
      }
    }

    gainTimer += dtMs
    if (gainTimer >= GAIN_FLUSH_MS && p.pendingGain >= 1) {
      gainTimer = 0
      const amount = Math.floor(p.pendingGain)
      p.pendingGain -= amount
      giveSpeed(amount, p.pendingSrc)
      dispatch('stats', { speed: profile.speed, xp: profile.xp, level: profile.level })
    }

    if (dirty && now - lastSave > 3000) save()
  }, TICK_MS)

  const onHide = () => save()
  window.addEventListener('pagehide', onHide)

  // Same opening the server gives: init -> client spawns at the lobby.
  const lbRow = () => [{ name: profile.name, value: 0 }]
  dispatch('init', {
    expedition: p.expedition,
    sid: 'offline',
    roomId: 'offline',
    now: Date.now(),
    profile: privateProfile(),
    spawn: { ...LOBBY_SPAWN },
    players: [],
    lb: {
      level: lbRow().map((r) => ({ ...r, value: profile.totalLevel })),
      rebirths: lbRow().map((r) => ({ ...r, value: profile.rebirths })),
      wins: lbRow().map((r) => ({ ...r, value: profile.wins })),
    },
    dev: DEV_TOOLS,
  })
  dispatch('friends', { count: 0 })

  return {
    send(type, msg) {
      try {
        handlers[type]?.(msg ?? {})
      } catch (err) {
        console.warn(`[offline] ${type} failed`, err)
      }
    },
    stop() {
      clearInterval(timer)
      window.removeEventListener('pagehide', onHide)
      save()
    },
  }
}
