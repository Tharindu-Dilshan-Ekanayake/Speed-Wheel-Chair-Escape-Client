/**
 * Shared game data + deterministic world layout.
 *
 * THIS FILE IS SHARED between the client and the server. The canonical copy lives in
 * Speed-Wheel-Chair-Escape-Client/src/shared/gameData.js; the server keeps an identical
 * copy at Speed-Wheel-Chair-Escape-Server/src/shared/gameData.js
 * (run `npm run sync-shared` in the server repo after editing).
 *
 * Pure data + pure functions only: no three.js, no DOM, no Node APIs.
 */

/* ------------------------------------------------------------------ */
/* Feature flags                                                        */
/* ------------------------------------------------------------------ */

/**
 * Dev tool (stage jumper, free wins). Set to false before a public release —
 * the server refuses every dev message when this is false.
 */
export const DEV_TOOLS = true

export const GAME_ID = 'speed-wheel-chair-escape'
export const ROOM_NAME = 'lobby'
export const MAX_PLAYERS_PER_LOBBY = 8

/* ------------------------------------------------------------------ */
/* Progression                                                          */
/* ------------------------------------------------------------------ */

/** Levels per rebirth. Reaching it unlocks Rebirth. */
export const MAX_LEVEL = 15

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level) {
  return Math.floor(50 * Math.pow(1.42, level - 1))
}

/** Speed gained is multiplied by this per rebirth. */
export const REBIRTH_SPEED_BONUS = 0.5
/** Wins from return pads are multiplied by this per rebirth. */
export const REBIRTH_WIN_BONUS = 0.25

/** Roblox-style walkspeed number -> world metres per second. */
export const WALK_TO_WORLD = 0.4
/** One "step" (one speed payout) per this many metres travelled. */
export const STEP_DISTANCE = 1.2
/** Speed payout per second while sitting on a treadmill = perStep * this * multiplier. */
export const TREADMILL_STEPS_PER_SEC = 4

export const BASE_WALKSPEED = 16

/** Max walkspeed: level adds a little (capped by MAX_LEVEL), chairs add more. */
export function maxWalkSpeed(profile) {
  const chair = chairById(profile.chair) || CHAIRS[0]
  return (
    BASE_WALKSPEED +
    (Math.min(profile.level, MAX_LEVEL) - 1) +
    Math.min(profile.rebirths || 0, 10) +
    chair.move
  )
}

export function walkSpeed(profile) {
  const max = maxWalkSpeed(profile)
  const custom = profile.customSpeed || 0
  return custom > 0 ? Math.min(custom, max) : max
}

export function petSlots(rebirths = 0) {
  return 3 + (rebirths >= 2 ? 1 : 0) + (rebirths >= 5 ? 1 : 0)
}

export const MAX_PETS = 60

/* ------------------------------------------------------------------ */
/* Shop catalogues (everything is bought with WINS)                     */
/* ------------------------------------------------------------------ */

export const CHAIRS = [
  { id: 'classic', name: 'Classic Chair', price: 0, reb: 0, perStep: 2, move: 0, color: '#9ec9ff', frame: '#e8f1ff', wheel: '#f4f7ff', aura: null },
  { id: 'blaze', name: 'Blaze Chair', price: 15, reb: 0, perStep: 5, move: 2, color: '#ff6a2b', frame: '#3a2a20', wheel: '#ffb347', aura: '#ff7a1a' },
  { id: 'frost', name: 'Frost Chair', price: 60, reb: 0, perStep: 10, move: 4, color: '#59c8ff', frame: '#20324a', wheel: '#bdf0ff', aura: '#7fd8ff' },
  { id: 'toxic', name: 'Toxic Chair', price: 180, reb: 0, perStep: 20, move: 6, color: '#61ff3d', frame: '#1d3a1a', wheel: '#a8ff7a', aura: '#7dff3a' },
  { id: 'neon', name: 'Neon Chair', price: 500, reb: 1, perStep: 40, move: 8, color: '#ff3dd8', frame: '#2a1238', wheel: '#38e1ff', aura: '#ff4ff0' },
  { id: 'glitch', name: 'Glitch Chair', price: 1500, reb: 2, perStep: 80, move: 10, color: '#1b1b2e', frame: '#ff2e63', wheel: '#08f7fe', aura: 'rainbow' },
  { id: 'galaxy', name: 'Galaxy Chair', price: 4000, reb: 4, perStep: 160, move: 13, color: '#6b3dff', frame: '#120a3a', wheel: '#c9b8ff', aura: '#9d7bff' },
  { id: 'king', name: 'Golden King Chair', price: 12000, reb: 7, perStep: 320, move: 16, color: '#ffd23d', frame: '#7a4b00', wheel: '#fff2a8', aura: '#ffe066' },
]

export const TREADMILLS = [
  { id: 't1', name: 'Starter', mult: 1, price: 0, reb: 0, color: '#ffffff' },
  { id: 't3', name: '3x Speed', mult: 3, price: 50, reb: 0, color: '#9b5bff' },
  { id: 't6', name: '6x Speed', mult: 6, price: 200, reb: 0, color: '#2ee6ff' },
  { id: 't9', name: '9x Speed', mult: 9, price: 600, reb: 1, color: '#ffd400' },
  { id: 't25', name: '25x Speed', mult: 25, price: 2000, reb: 3, color: '#39ff5a' },
  { id: 't100', name: '100x Speed', mult: 100, price: 8000, reb: 6, color: '#33b5ff' },
  { id: 't1000', name: '1000x Speed', mult: 1000, price: 50000, reb: 12, color: 'rainbow' },
]

export const RARITY = {
  common: { label: 'Common', color: '#cfd8dc' },
  uncommon: { label: 'Uncommon', color: '#5cff6b' },
  rare: { label: 'Rare', color: '#3db4ff' },
  epic: { label: 'Epic', color: '#c158ff' },
  legendary: { label: 'Legendary', color: '#ffc21a' },
}

/** Pets: `mult` is the speed multiplier. Equipped pets stack additively. */
export const PETS = {
  dog: { emoji: '🐶', name: 'Dog', mult: 1.1, rarity: 'common', body: '#c98b4f', accent: '#7a4f28', ears: 'flop' },
  cat: { emoji: '🐱', name: 'Cat', mult: 1.15, rarity: 'common', body: '#f2a65a', accent: '#ffffff', ears: 'point' },
  bunny: { emoji: '🐰', name: 'Bunny', mult: 1.25, rarity: 'uncommon', body: '#f5f5f5', accent: '#ffb6c9', ears: 'long' },
  bear: { emoji: '🐻', name: 'Bear', mult: 1.4, rarity: 'rare', body: '#8b5a2b', accent: '#d9a066', ears: 'round' },

  piggy: { emoji: '🐷', name: 'Piggy', mult: 1.5, rarity: 'common', body: '#ffa6c9', accent: '#ff6f9f', ears: 'point' },
  fox: { emoji: '🦊', name: 'Fox', mult: 1.7, rarity: 'uncommon', body: '#ff7b2e', accent: '#ffffff', ears: 'point' },
  panda: { emoji: '🐼', name: 'Panda', mult: 2, rarity: 'rare', body: '#ffffff', accent: '#222222', ears: 'round' },
  unicorn: { emoji: '🦄', name: 'Unicorn', mult: 2.5, rarity: 'legendary', body: '#fff0fb', accent: '#c38bff', ears: 'horn' },

  chick: { emoji: '🐥', name: 'Chick', mult: 2.5, rarity: 'common', body: '#ffe14d', accent: '#ff9a1a', ears: 'none' },
  lion: { emoji: '🦁', name: 'Lion', mult: 3, rarity: 'uncommon', body: '#e8a33d', accent: '#9b5a12', ears: 'mane' },
  tiger: { emoji: '🐯', name: 'Tiger', mult: 3.5, rarity: 'rare', body: '#ff8c1a', accent: '#1a1a1a', ears: 'round' },
  goldDragon: { emoji: '🐲', name: 'Golden Dragon', mult: 5, rarity: 'legendary', body: '#ffd23d', accent: '#ff9d00', ears: 'horn' },

  slime: { emoji: '🦠', name: 'Slime', mult: 5, rarity: 'common', body: '#6bff4f', accent: '#2f9e1f', ears: 'none' },
  frog: { emoji: '🐸', name: 'Frog', mult: 6, rarity: 'uncommon', body: '#35c94a', accent: '#c8ff7a', ears: 'eyes' },
  toxicBat: { emoji: '🦇', name: 'Toxic Bat', mult: 8, rarity: 'epic', body: '#3a3a3a', accent: '#7dff3a', ears: 'wing' },
  rDragon: { emoji: '🐉', name: 'Radioactive Dragon', mult: 12, rarity: 'legendary', body: '#2bff88', accent: '#0c5a2a', ears: 'horn' },

  imp: { emoji: '😈', name: 'Imp', mult: 10, rarity: 'common', body: '#e0303a', accent: '#5a0b10', ears: 'horn' },
  hellhound: { emoji: '🐺', name: 'Hellhound', mult: 14, rarity: 'uncommon', body: '#2a1a1a', accent: '#ff5a1a', ears: 'point' },
  demon: { emoji: '👹', name: 'Demon', mult: 20, rarity: 'epic', body: '#b3001b', accent: '#ffcc00', ears: 'horn' },
  overlord: { emoji: '👿', name: 'Overlord', mult: 35, rarity: 'legendary', body: '#14001f', accent: '#ff2bd6', ears: 'horn' },
}

export const EGGS = [
  { id: 'basic', name: 'Basic Egg', price: 25, reb: 0, color: '#ffffff', spots: '#d8e6ff', pets: [['dog', 45], ['cat', 33], ['bunny', 17], ['bear', 5]] },
  { id: 'candy', name: 'Candy Egg', price: 150, reb: 0, color: '#ffc4ef', spots: '#9fe8ff', pets: [['piggy', 45], ['fox', 33], ['panda', 18], ['unicorn', 4]] },
  { id: 'golden', name: 'Golden Egg', price: 600, reb: 0, color: '#ffe23d', spots: '#ffb800', pets: [['chick', 45], ['lion', 33], ['tiger', 18], ['goldDragon', 4]] },
  { id: 'toxic', name: 'Toxic Egg', price: 2000, reb: 1, color: '#2a3a2a', spots: '#6bff3a', pets: [['slime', 45], ['frog', 33], ['toxicBat', 18], ['rDragon', 4]] },
  { id: 'demon', name: 'Demon Egg', price: 6000, reb: 2, color: '#d3182b', spots: '#ffb02e', pets: [['imp', 45], ['hellhound', 33], ['demon', 18], ['overlord', 4]] },
]

export const TRAILS = [
  { id: 'none', name: 'No Trail', price: 0, reb: 0, colors: [] },
  { id: 'rainbow', name: 'Rainbow', price: 30, reb: 0, colors: ['#ff3b3b', '#ffb02e', '#ffe83b', '#3bff6b', '#3bb4ff', '#b03bff'] },
  { id: 'fire', name: 'Fire', price: 80, reb: 0, colors: ['#ff3d00', '#ff9100', '#ffd600'] },
  { id: 'ice', name: 'Ice', price: 80, reb: 0, colors: ['#e0f7ff', '#7fd8ff', '#2aa8ff'] },
  { id: 'toxic', name: 'Toxic', price: 150, reb: 0, colors: ['#7dff3a', '#2bff88', '#d4ff3a'] },
  { id: 'stars', name: 'Stars', price: 300, reb: 0, colors: ['#ffffff', '#fff59d', '#ffd54f'] },
  { id: 'galaxy', name: 'Galaxy', price: 800, reb: 1, colors: ['#7c4dff', '#e040fb', '#18ffff', '#ffffff'] },
  { id: 'gold', name: 'Golden', price: 2000, reb: 3, colors: ['#ffd700', '#fff3a0', '#ffb300'] },
]

export const AURAS = [
  { id: 'none', name: 'No Aura', price: 0, reb: 0, colors: [] },
  { id: 'blue', name: 'Blue Glow', price: 50, reb: 0, colors: ['#4fc3ff', '#9ee6ff'] },
  { id: 'fire', name: 'Inferno', price: 120, reb: 0, colors: ['#ff5a1a', '#ffb300'] },
  { id: 'toxic', name: 'Toxic Cloud', price: 200, reb: 0, colors: ['#7dff3a', '#2bff88'] },
  { id: 'electric', name: 'Electric', price: 500, reb: 0, colors: ['#fff83b', '#3bf0ff'] },
  { id: 'shadow', name: 'Shadow', price: 1200, reb: 1, colors: ['#3a0057', '#9b30ff'] },
  { id: 'rainbow', name: 'Rainbow', price: 3000, reb: 2, colors: ['#ff3b3b', '#ffe83b', '#3bff6b', '#3bb4ff', '#b03bff'] },
  { id: 'divine', name: 'Divine', price: 8000, reb: 5, colors: ['#ffffff', '#ffe98a', '#ffd23d'] },
]

/** Bottom-bar speed packs. */
export const SPEED_PACKS = [
  { id: 'p1', label: '+500 Speed', amount: 500, price: 8, key: '1', color: 'blue' },
  { id: 'p2', label: '+5K Speed', amount: 5000, price: 60, key: '2', color: 'orange' },
  { id: 'p3', label: '+50K Speed', amount: 50000, price: 450, key: '3', color: 'pink' },
]

/** The 2x wins pad stays locked until you hold this many wins (they are not spent). */
export const BONUS_PAD_MIN_WINS = 100

export const X2_BOOST = { price: 40, minutes: 10 }

export const DAILY_REWARDS = [10, 20, 35, 50, 75, 100, 200]
export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000
export const DAILY_STREAK_RESET_MS = 48 * 60 * 60 * 1000

/** +10% per other player in your lobby. */
export const FRIEND_BOOST_PER_PLAYER = 0.1

/* ------------------------------------------------------------------ */
/* Lookups                                                              */
/* ------------------------------------------------------------------ */

export const chairById = (id) => CHAIRS.find((c) => c.id === id)
export const treadmillById = (id) => TREADMILLS.find((t) => t.id === id)
export const eggById = (id) => EGGS.find((e) => e.id === id)
export const trailById = (id) => TRAILS.find((t) => t.id === id)
export const auraById = (id) => AURAS.find((a) => a.id === id)

export function petMultiplier(profile) {
  let bonus = 0
  for (const uid of profile.equippedPets || []) {
    const pet = (profile.pets || []).find((p) => p.uid === uid)
    if (pet && PETS[pet.type]) bonus += PETS[pet.type].mult - 1
  }
  return 1 + bonus
}

/** Total multiplier applied to every speed payout. */
export function speedMultiplier(profile, { friends = 0, now = Date.now() } = {}) {
  const reb = 1 + (profile.rebirths || 0) * REBIRTH_SPEED_BONUS
  const x2 = (profile.boostUntil || 0) > now ? 2 : 1
  const friend = 1 + Math.min(friends, 7) * FRIEND_BOOST_PER_PLAYER
  return reb * x2 * friend * petMultiplier(profile)
}

export function formatNum(n) {
  n = Math.floor(n || 0)
  if (n < 10000) return n.toLocaleString('en-US')
  const units = [
    [1e15, 'Qa'],
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [v, s] of units) {
    if (n >= v) {
      const x = n / v
      return (x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10) + s
    }
  }
  return String(n)
}

/* ------------------------------------------------------------------ */
/* World layout                                                         */
/* ------------------------------------------------------------------ */

/** Lobby is a square from -LOBBY_HALF..LOBBY_HALF on x and z. Stages extend to -z. */
export const LOBBY_HALF = 42
/** Thickness of the lobby's outer walls; the stage-1 gate is a tunnel this long. */
export const LOBBY_WALL = 6
export const LOBBY_SPAWN = { x: 0, y: 1.5, z: 16, yaw: Math.PI }
/** Stage corridors are 44m wide; the lobby gate that leads into stage 1 stays narrow. */
// Wide enough for the wheelchair to dodge cleanly while leaving room for scenery.
export const CORRIDOR_W = 88
export const GATE_W = 18
export const WALL_H = 20
export const SAFE_ROOM_LEN = 40

export const LOBBY = {
  treadmills: TREADMILLS.map((t, i) => ({
    id: t.id,
    x: -32,
    z: -26 + i * 7.6,
    w: 5.5, // along z
    l: 8, // along x
  })),
  chairs: CHAIRS.map((c, i) => ({ id: c.id, x: 33, z: -28 + i * 7.4 })),
  eggs: EGGS.map((e, i) => ({ id: e.id, x: -20 + i * 10, z: 34 })),
  leaderboards: [
    // Pushed out to the corners so they never crowd the stage-1 gate in the middle.
    { kind: 'level', x: -35.5, z: -38 },
    { kind: 'rebirths', x: -23.5, z: -38 },
    { kind: 'wins', x: 35.5, z: -38 },
  ],
  daily: { x: 21, z: -35 },
  gate: { x: 0, z: -LOBBY_HALF },
}

const THEMES = [
  null,
  { name: 'Sunset Academy', mascot: '🔥', floor: '#aeb8cf', wall: '#b7222c', wall2: '#ffd23d', accent: '#ff5b33', sky: '#301421', kill: '#ff5a1a', cell: '#32100b' },
  { name: "Grandma's Blue House", mascot: '👵', floor: '#1679c9', wall: '#073d91', wall2: '#1168d8', accent: '#35e8ff', sky: '#0b2d70', kill: '#24bfff' },
  { name: 'Green Reactor', mascot: '☢️', floor: '#167445', wall: '#0a301d', wall2: '#16a653', accent: '#b7ff2a', sky: '#071d14', kill: '#63ff2b', cell: '#102816' },
  { name: 'Lava Citadel', mascot: '🔥', floor: '#8f93bc', wall: '#3b405e', wall2: '#ff7922', accent: '#ffd34d', sky: '#252942', kill: '#ff6a00' },
  { name: 'Tsunami Bay', mascot: '🌊', floor: '#168bc9', wall: '#0753a0', wall2: '#26cbff', accent: '#e8fbff', sky: '#0a4f94', kill: '#1e90ff', arrow: true },
  { name: 'Candy City', mascot: '🍭', floor: '#ffb3e6', wall: '#ff6fcf', wall2: '#ffffff', accent: '#ff3d9a', sky: '#ffe3f6', kill: '#ff2e7a' },
  { name: 'Ice Cave', mascot: '🥶', snow: true, floor: '#d6f3ff', wall: '#8fdcff', wall2: '#c7efff', accent: '#2aa8ff', sky: '#e8fbff', kill: '#3fa9ff' },
  { name: 'Jungle Ruins', mascot: '🐍', floor: '#79c94a', wall: '#3f8f2a', wall2: '#8a5a2b', accent: '#ffd23d', sky: '#d6ffc4', kill: '#3d7a1a' },
  { name: 'Tornado Desert', mascot: '🌪️', floor: '#f2d27a', wall: '#d9a74a', wall2: '#f5e1a4', accent: '#00b3b3', sky: '#fff1c4', kill: '#ff7a00' },
  { name: 'Laser Lab', mascot: '🤖', floor: '#3a3f5c', wall: '#22263a', wall2: '#00e0ff', accent: '#ff2e63', sky: '#9aa6d6', kill: '#ff1744' },
  { name: 'Haunted Manor', mascot: '👻', floor: '#5b4a7a', wall: '#3a2b52', wall2: '#7a5aa8', accent: '#b8ff3a', sky: '#8a7aa8', kill: '#9b30ff' },
  { name: 'Volcano Core', mascot: '🌋', floor: '#4a3a3a', wall: '#2a1a1a', wall2: '#ff5a1a', accent: '#ffb300', sky: '#ffb08a', kill: '#ff3d00' },
  { name: 'Space Station', mascot: '👽', floor: '#3a4a7a', wall: '#1a2350', wall2: '#5a7aff', accent: '#39ff14', sky: '#4a5a9a', kill: '#ff2bd6' },
  { name: 'Storm Peak', mascot: '⚡', snow: true, floor: '#a0a8b8', wall: '#5a6278', wall2: '#ffe83b', accent: '#ffe83b', sky: '#c8d0e0', kill: '#3d5afe' },
  { name: 'Golden Palace', mascot: '👑', floor: '#fff1a8', wall: '#ffc21a', wall2: '#ffffff', accent: '#ff3d6e', sky: '#fff8d6', kill: '#ff1744' },
]

/**
 * Stage design.
 *  modules: course building blocks, run in order along -z.
 *  chaser: an NPC that chases the player through the whole course (walkspeed units).
 */
export const STAGES = [
  null,
  // Opening worlds are distinct, readable set pieces rather than interchangeable halls.
  { rec: 1, wins: 1, gate: 25, tp: 0, modules: ['stairs', 'lavaBridge', 'gate'] },
  { rec: 3, wins: 2, gate: 34, tp: 5, modules: ['grandmaRide', 'hurdles', 'gate'] },
  { rec: 4, wins: 3, gate: 50, tp: 10, modules: ['puddles', 'greenBridge', 'bigBall', 'gate'] },
  // Medium adventure (4-6): learn to read moving hazards and shelter spaces.
  { rec: 5, wins: 5, gate: 80, tp: 20, modules: ['lavafalls', 'canyon', 'bigBall', 'gate'] },
  { rec: 6, wins: 8, gate: 150, tp: 35, modules: ['collapse', 'wave', 'river', 'gate'] },
  { rec: 7, wins: 12, gate: 250, tp: 55, modules: ['buildings', 'hurdles', 'sweeper', 'greenBridge', 'gate'] },
  // Difficult adventure (7-9): layered timing, movement and changing lanes.
  { rec: 8, wins: 18, gate: 400, tp: 80, modules: ['jungle', 'falling', 'pendulum', 'lavaBridge', 'gate'] },
  { rec: 9, wins: 25, gate: 600, tp: 110, modules: ['jungle', 'greenBridge', 'pendulum', 'gate'] },
  { rec: 10, wins: 35, gate: 900, tp: 150, modules: ['tornado', 'pillars', 'bigBall', 'lavaBalls', 'gate'] },
  // Hard adventure (10-12): pressure routes with no dead, confusing stretches.
  { rec: 11, wins: 50, gate: 1300, tp: 200, modules: ['lasers', 'sweeper', 'pushers', 'greenBridge', 'gate'] },
  { rec: 12, wins: 70, gate: 1800, tp: 260, modules: ['hurdles', 'bigBall', 'pushers', 'gate'] },
  { rec: 12, wins: 95, gate: 2500, tp: 330, modules: ['lavaBridge', 'lavaJump', 'lavafalls', 'bigBall', 'gate'] },
  // Finale adventure (13-15): every major set piece gets a readable stage of its own.
  { rec: 13, wins: 130, gate: 3500, tp: 420, modules: ['lasers', 'tornado', 'greenBridge', 'collapse', 'gate'] },
  { rec: 14, wins: 175, gate: 5000, tp: 520, modules: ['tornado', 'wave', 'bigBall', 'sweeper', 'gate'] },
  { rec: 15, wins: 250, gate: 8000, tp: 650, chaser: { speed: 44, kind: 'king', line: 'Bow before the King!' }, modules: ['lavaBridge', 'greenBridge', 'tornado', 'wave', 'bigBall', 'collapse', 'lavaBalls', 'gate'] },
]

/** 1 easy (stages 1-3), 2 medium (4-6), 3 a bit hard (7-9), 4 hard (10-12), 5 very hard (13-15). */
export function stageTier(k) {
  return Math.min(5, Math.ceil(k / 3))
}

export const STAGE_COUNT = STAGES.length - 1

const MODULE_LEN = {
  plain: 36,
  spikes: 48,
  gate: 18,
  puddles: 48,
  rollers: 64,
  lavaJump: 52,
  swamp: 52,
  wave: 84,
  sweeper: 46,
  pushers: 48,
  falling: 52,
  pendulum: 52,
  lasers: 48,
  steps: 44,
  stairs: 44,
  pillars: 50,
  canyon: 60,
  collapse: 60,
  tide: 60,
  river: 52,
  lavafalls: 54,
  lavaBalls: 56,
  tornado: 56,
  buildings: 52,
  jungle: 52,
  ice: 48,
  lavaBridge: 66,
  greenBridge: 64,
  grandmaRide: 64,
  bigBall: 76,
  hurdles: 48,
}

/** Small deterministic PRNG so client and server build the same world. */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function courseLength(k) {
  return 8 + STAGES[k].modules.reduce((sum, m) => sum + MODULE_LEN[m], 0)
}

/** World z where stage k's course begins (the checkpoint). Decreasing with k. */
export function stageStartZ(k) {
  let z = -LOBBY_HALF - SAFE_ROOM_LEN // stage 1 intro room sits right past the lobby gate
  for (let i = 1; i < k; i += 1) z -= courseLength(i) + SAFE_ROOM_LEN
  return z
}

export function stageEndZ(k) {
  return stageStartZ(k) - courseLength(k)
}

/** Spawn point at the start of stage k (just inside its intro room). */
export function stageSpawn(k) {
  if (k <= 0) return { ...LOBBY_SPAWN }
  return { x: -7, y: 1.5, z: stageStartZ(k) + 6, yaw: Math.PI }
}

/**
 * Which stage region a z belongs to. 0 = lobby. The intro room before stage k counts as
 * stage k. Returns { stage, inCourse, inSafe } where inSafe = the safe room AFTER `stage`.
 */
export function regionAtZ(z) {
  if (z > -LOBBY_HALF) return { stage: 0, inCourse: false, inSafe: false }
  for (let k = 1; k <= STAGE_COUNT; k += 1) {
    const start = stageStartZ(k)
    const end = stageEndZ(k)
    if (z > start) return { stage: k, inCourse: false, inSafe: false } // intro room of k
    if (z > end) return { stage: k, inCourse: true, inSafe: false }
    if (z > end - SAFE_ROOM_LEN) return { stage: k, inCourse: false, inSafe: true }
  }
  return { stage: STAGE_COUNT, inCourse: false, inSafe: true }
}

/** "Stage N" title, mascot and recommended level, mounted above the doorway / on the arch. */
function pushIntroSigns(signs, k, z, mount) {
  const t = THEMES[k]
  const s = STAGES[k]
  const arch = mount === 'arch'
  const x = 0
  signs.push({ kind: 'title', x, y: arch ? 18.2 : 15.6, z, text: `Stage ${k}`, color: t.accent, stage: k })
  signs.push({ kind: 'mascot', x: arch ? 5 : 9, y: arch ? 11.5 : 15.6, z: z + 0.3, emoji: t.mascot, arrow: !!t.arrow, stage: k })
  if (!arch) signs.push({ kind: 'sub', x, y: 18.4, z, text: t.name, stage: k })
  signs.push({ kind: 'rec', x: arch ? 14.5 : 0, y: arch ? 3.4 : 12, z, text: `Level ${s.rec}\nRecommended`, stage: k })
}

/**
 * Build the full geometry + hazard description of stage k.
 *
 * Coordinates are world space. Boxes are axis-aligned: { x, y, z, w, h, d, color, kind }
 * where (x,y,z) is the centre and w/h/d the full size on x/y/z.
 * kind: 'solid' (collides), 'deco' (visual only), 'kill' (visual + kills on touch).
 */
export function buildStage(k) {
  const theme = THEMES[k]
  const def = STAGES[k]
  const rand = rng(k * 7919 + 13)
  const W = CORRIDOR_W
  const half = W / 2
  /** Usable half-width: every second wall panel sticks out 1.8m into the corridor. */
  const P = half - 2.2
  const boxes = []
  const hazards = []
  const gates = []
  const signs = []
  const currents = []
  const rivers = []

  const z0 = stageStartZ(k)
  const zEnd = stageEndZ(k)
  const len = z0 - zEnd

  const solid = (x, y, z, w, h, d, color, extra) =>
    boxes.push({ x, y, z, w, h, d, color, kind: 'solid', ...extra })
  const deco = (x, y, z, w, h, d, color, extra) =>
    boxes.push({ x, y, z, w, h, d, color, kind: 'deco', ...extra })
  const kill = (x, y, z, w, h, d, color, extra) => {
    boxes.push({ x, y, z, w, h, d, color, kind: 'kill', cell: theme.cell, ...extra })
  }
  const zAt = (dist) => z0 - dist
  const floor = (from, to, color = theme.floor) => {
    solid(0, -0.5, zAt((from + to) / 2), W, 1, to - from, color)
    if (k === 1) {
      const tile = 4
      let i = 0
      for (let dz = from; dz < to - 0.01; dz += tile) {
        const length = Math.min(tile - 0.12, to - dz)
        deco(0, 0.035, zAt(dz + length / 2), W - 1.5, 0.08, length, i % 2 ? '#eee7d5' : '#9d3035')
        i += 1
      }
    }
  }
  /** A solid slab from below the floor up to `top`. */
  const slab = (x, top, from, to, w, color = theme.floor) =>
    solid(x, (top - 1) / 2, zAt((from + to) / 2), w, top + 1, to - from + 0.01, color)
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  // Entry strip (8m) - always safe, the checkpoint lands here.
  solid(0, -0.5, z0 - 4, W, 1, 8, theme.floor)

  let d = 8 // distance into the course

  if (k === 1) {
    // Stage 1 is a red-and-gold academy hall: enclosed, readable and intentionally simple.
    let brick = 0
    for (let z = z0; z > zEnd + 0.01; z -= 8) {
      const segLen = Math.min(8, z - zEnd)
      const zc = z - segLen / 2
      const color = ['#b7222c', '#ffd23d', '#8f1720'][brick % 3]
      for (const side of [-1, 1]) {
        solid(side * (half + 1), WALL_H / 2, zc, 2, WALL_H, segLen - 0.25, color)
        deco(side * half, 3.5 + (brick % 2) * 4, zc, 0.18, 0.28, segLen - 1, '#ffde5c', { neon: true })
      }
      brick += 1
    }
  } else {
    // Every later world gets an actual themed corridor shell. The original open strips
    // looked unfinished from the player's camera and offered no visual rhythm to race through.
    let panel = 0
    for (let z = z0; z > zEnd + 0.01; z -= 10) {
      const segLen = Math.min(10, z - zEnd)
      const zc = z - segLen / 2
      const wallColor = panel % 3 === 1 ? theme.wall2 : theme.wall
      for (const side of [-1, 1]) {
        solid(side * (half + 1), WALL_H / 2, zc, 2, WALL_H, segLen - 0.16, wallColor)
        deco(side * (half - 0.08), 8.5, zc, 0.14, 10, segLen - 1, theme.accent, { neon: true })
        if (panel % 2 === 0) {
          deco(side * (half - 1.1), 4.5, zc, 1.2, 9, 1.2, theme.wall2)
          deco(side * (half - 0.45), 13.5, zc, 0.16, 0.18, 4.2, theme.accent, { neon: true })
        }
      }
      panel += 1
    }
    if (k === 3) {
      // Reactor drums make the toxic world feel like a destination, not green paint on a hallway.
      for (let i = 0; i < 12; i += 1) {
        const side = i % 2 ? 1 : -1
        boxes.push({ x: side * (P - 3 - (i % 3) * 2.5), y: 1.25, z: zAt(15 + i * 13), w: 2.4, h: 2.5, d: 2.4, color: '#d6b62b', kind: 'solid', barrel: true })
        deco(side * (P - 3 - (i % 3) * 2.5), 2.45, zAt(15 + i * 13), 1.5, 0.12, 1.5, '#b7ff2a', { neon: true })
      }
    }
  }

  /** Unlit glowing box (light strips, rails, edges). */
  const neon = (x, y, z, w, h, dd, color) => boxes.push({ x, y, z, w, h, d: dd, color, kind: 'deco', neon: true })
  /** Difficulty tier of this stage: 1 easy ... 5 very hard. Modules scale themselves with it. */
  const T = stageTier(k)
  const pick = (arr) => arr[Math.min(arr.length, T) - 1]

  for (const mod of def.modules) {
    const L = MODULE_LEN[mod]
    const a = d
    const b = d + L
    const zc = zAt((a + b) / 2)

    switch (mod) {
      case 'plain': {
        floor(a, b)
        // Carpet runner with glowing edges.
        deco(0, 0.025, zc, 9, 0.05, L - 2, theme.accent)
        for (const sx of [-1, 1]) neon(sx * 4.8, 0.03, zc, 0.3, 0.06, L - 2, '#ffffff')
        for (let i = 0; i < 3; i += 1) {
          const h = i % 2 ? 8 : 4.5
          for (const sx of [-1, 1]) {
            solid(sx * (P - 2), h / 2, zAt(a + 7 + i * ((L - 14) / 2)), 3.4, h, 3.4, i % 2 ? theme.accent : theme.wall2)
          }
        }
        if (k === 1) {
          // Baby's room: stacks of toy blocks along both walls.
          const cols = ['#ff4d4d', '#3da5ff', '#ffd23d', '#4dd96a']
          for (let i = 0; i < 5; i += 1) {
            for (const sx of [-1, 1]) {
              const bz = zAt(a + 4 + i * 7 + (sx > 0 ? 2 : 0))
              const bx = sx * (P - 7)
              solid(bx, 1.1, bz, 2.2, 2.2, 2.2, cols[(i + (sx > 0 ? 1 : 0)) % 4])
              if (i % 2 === 0) solid(bx, 3.3, bz, 2.2, 2.2, 2.2, cols[(i + 2) % 4])
            }
          }
        }
        break
      }
      case 'spikes': {
        floor(a, b)
        // Cones along both walls + a field with a winding safe path through it.
        for (let dz = a + 3; dz < b - 2; dz += 4.5) {
          hazards.push({ type: 'spike', x: -(P - 1), z: zAt(dz), r: 1.1, h: 3.2 })
          hazards.push({ type: 'spike', x: P - 1, z: zAt(dz + 2.2), r: 1.1, h: 3.2 })
        }
        let path = 0
        for (let dz = a + 7; dz < b - 5; dz += 5.5) {
          path = clamp(path + (rand() - 0.5) * 14, -P * 0.5, P * 0.5)
          for (let x = -(P - 2); x <= P - 2; x += 5.5) {
            if (Math.abs(x - path) < 4.8) continue
            hazards.push({ type: 'spike', x: x + (rand() - 0.5), z: zAt(dz + (rand() - 0.5)), r: 1.0, h: 2.6 })
          }
        }
        break
      }
      case 'gate': {
        floor(a, b)
        const gx = [-8, 8, 0][k % 3]
        gates.push({ idx: gates.length, x: gx, z: zAt(a + L / 2), amount: def.gate, w: 11 })
        break
      }
      case 'puddles': {
        floor(a, b)
        const n = 6
        const sw = (2 * P) / n
        const rows = 5 + T
        const step = (L - 12) / rows
        for (let r = 0; r < rows; r += 1) {
          const clear = Math.floor(rand() * n)
          for (let i = 0; i < n; i += 1) {
            if (i === clear || (i === (clear + 2) % n && rand() < 0.5)) continue
            kill(-P + (i + 0.5) * sw, 0.06, zAt(a + 6 + r * step), sw - 0.4, 0.12, 4, theme.kill, { glow: true })
          }
        }
        for (let i = 0; i < 6; i += 1) {
          const side = i % 2 === 0 ? -1 : 1
          boxes.push({ x: side * (P - 1.6), y: 1.2, z: zAt(a + 4 + i * 7.5), w: 2.4, h: 2.4, d: 2.4, color: '#ffcc00', kind: 'solid', barrel: true })
        }
        break
      }
      case 'rollers':
      case 'lavaBalls': {
        // Balls rolling down the lanes; lava balls are red and green and leap across too.
        floor(a, b)
        const lava = mod === 'lavaBalls'
        const n = 7
        const lw = (2 * P) / n
        const count = 4 + T * 2
        for (let i = 0; i < count; i += 1) {
          const green = lava && i % 2 === 1
          hazards.push({
            type: 'roller',
            x: -P + (Math.floor(rand() * n) + 0.5) * lw + (rand() - 0.5) * 1.5,
            zFrom: zAt(b - 1),
            zTo: zAt(a + 1),
            r: lava ? 2.1 : 2.3,
            period: 5.4 - T * 0.2 + rand() * 1.6,
            offset: rand() * 10,
            color: lava ? (green ? '#39ff6b' : '#ff3b1a') : theme.kill,
            cell: lava ? (green ? '#0d2a14' : '#2a0d08') : theme.cell,
          })
        }
        if (lava) {
          for (let i = 0; i < 1 + Math.floor(T / 2); i += 1) {
            hazards.push({ type: 'lavaBall', z: zAt(a + 16 + i * 14), half: P, r: 1.1, height: 6, period: 4.2 - T * 0.15, offset: i * 1.7, dir: i % 2 ? -1 : 1, color: i % 2 ? '#ff3b1a' : '#39ff6b' })
          }
        }
        break
      }
      case 'lavaJump':
      case 'swamp': {
        kill(0, -0.4, zc, W, 0.6, L, mod === 'swamp' ? '#3f8f1a' : theme.kill, { glow: true, lava: true })
        rivers.push({ x: 0, z: zc, w: W, d: L, y: -0.65, vx: mod === 'swamp' ? -1.4 : 1.8, kind: mod === 'swamp' ? 'toxic' : 'lava' })
        const gap = 2.2 + T * 0.35
        let pd = a
        let px = 0
        let first = true
        while (pd < b - 6) {
          const pl = first ? 5 : 4 + rand() * 2.5
          const pw = first ? W : (8 + rand() * 5) * (1.15 - T * 0.06)
          px = first ? 0 : clamp(px + (rand() - 0.5) * 18, -(P - pw / 2), P - pw / 2)
          const dy = first ? 0 : rand() < 0.45 ? 0.6 : 0
          slab(px, dy, pd, pd + pl, pw)
          if (!first && rand() < 0.5) deco(px, dy + 0.06, zAt(pd + pl / 2), pw - 1, 0.1, pl - 1, theme.accent)
          pd += pl + (first ? 2.8 : gap + rand() * 0.8)
          first = false
        }
        slab(0, 0, b - 5, b, W)
        break
      }
      case 'canyon': {
        kill(0, -2.5, zc, W, 0.6, L, theme.kill, { glow: true, lava: true })
        rivers.push({ x: 0, z: zc, w: W, d: L, y: -2.2, vx: 2, kind: 'lava' })
        floor(a, a + 6)
        floor(b - 6, b)
        const lx = P * 0.72
        for (const ln of [
          { x: -lx, w: 6.4 },
          { x: 0, w: 5.4 },
          { x: lx, w: 6.4 },
        ]) {
          solid(ln.x, -0.5, zAt((a + b) / 2), ln.w, 1, L - 11.9, theme.floor)
        }
        for (let dz = a + 16; dz < b - 10; dz += 16) solid(0, -0.5, zAt(dz), P * 1.8, 1, 4, theme.floor)
        for (let dz = a + 10; dz < b - 8; dz += 7) {
          hazards.push({ type: 'spike', x: -lx + (rand() < 0.5 ? -2.4 : 2.4), z: zAt(dz), r: 1.0, h: 2.6 })
        }
        break
      }
      case 'stairs': {
        // Lava trench, then three big steps up to a plateau, then back down.
        floor(a, a + 8)
        kill(0, -0.4, zAt(a + 10), W, 0.6, 4, theme.kill, { glow: true, lava: true })
        ;[0.6, 1.2, 1.8].forEach((t, i) => slab(0, t, a + 12 + i * 5, a + 17 + i * 5, W, i % 2 ? theme.wall2 : theme.floor))
        slab(0, 1.8, a + 27, a + 34, W)
        for (let dz = a + 29; dz < a + 34; dz += 4.5) {
          hazards.push({ type: 'spike', x: -(P - 1), y: 1.8, z: zAt(dz), r: 1.0, h: 3 })
          hazards.push({ type: 'spike', x: P - 1, y: 1.8, z: zAt(dz + 2), r: 1.0, h: 3 })
        }
        floor(a + 34, b)
        break
      }
      case 'steps': {
        const seg = 6
        ;[0.9, 1.8, 2.7].forEach((t, i) => slab(0, t, a + i * seg, a + (i + 1) * seg, W, i % 2 ? theme.wall2 : theme.floor))
        const p0 = a + 3 * seg
        slab(0, 2.7, p0, p0 + 8, W)
        kill(-P / 2, 2.76, zAt(p0 + 2.5), P, 0.12, 3, theme.kill, { glow: true })
        kill(P / 2, 2.76, zAt(p0 + 5.5), P, 0.12, 3, theme.kill, { glow: true })
        ;[1.8, 0.9].forEach((t, i) => slab(0, t, p0 + 8 + i * seg, p0 + 8 + (i + 1) * seg, W, i % 2 ? theme.floor : theme.wall2))
        floor(p0 + 8 + 2 * seg, b)
        break
      }
      case 'pillars': {
        floor(a, b)
        let gap = 0
        for (let dz = a + 6; dz < b - 4; dz += 8) {
          gap = clamp(gap + (rand() - 0.5) * 16, -(P - 5), P - 5)
          for (let x = -(P - 2); x <= P - 2; x += 4.8) {
            if (Math.abs(x - gap) < 4.4) continue
            solid(x, 5, zAt(dz), 3.2, 10, 3.2, rand() < 0.5 ? theme.wall2 : theme.accent)
          }
        }
        break
      }
      case 'lavafalls': {
        // Lava columns pouring from the ceiling; slip through the gap in every row.
        floor(a, b)
        let gap = 0
        for (let dz = a + 8; dz < b - 6; dz += 9) {
          gap = clamp(gap + (rand() - 0.5) * 14, -(P - 5), P - 5)
          for (let x = -(P - 2); x <= P - 2; x += 4.8) {
            if (Math.abs(x - gap) < 4.4) continue
            kill(x, 8, zAt(dz), 3.4, 16, 3.4, theme.kill, { glow: true })
          }
        }
        break
      }
      case 'wave': {
        // Tsunami: a wall of water rolls down the corridor. Stand on a yellow shelter to be safe.
        floor(a, b)
        const shelters = []
        const xs = [-0.62, 0.55, -0.28, 0.7, -0.7, 0.22]
        let i = 0
        for (let dz = a + 10; dz < b - 6; dz += 13) {
          const sx = xs[i % xs.length] * (P - 4)
          i += 1
          shelters.push({ x: sx, z: zAt(dz), w: 7, d: 7 })
          deco(sx, 0.07, zAt(dz), 7, 0.14, 7, '#ffe83b')
          for (const cx of [-3.2, 3.2]) solid(sx + cx, 3, zAt(dz) - 3.2, 0.6, 6, 0.6, '#ffffff')
        }
        hazards.push({
          type: 'wave',
          zFrom: zAt(b),
          zTo: zAt(a),
          period: pick([13, 12, 11, 10, 9]),
          travel: pick([10, 9, 8.5, 8, 7.5]),
          offset: k,
          half,
          shelters,
          color: theme.kill,
        })
        break
      }
      case 'sweeper': {
        floor(a, b)
        const arm = P * 0.45
        ;[
          [-P * 0.5, zAt(a + 12), 1, arm],
          [P * 0.5, zAt(a + 16), -1, arm],
          [0, zAt(a + 34), 1, arm * 1.4],
        ].forEach(([x, z, dir, len]) => {
          hazards.push({ type: 'sweeper', x, z, len, y: 0.7, speed: dir * (1.2 + T * 0.14), offset: rand() * 6, color: theme.accent })
          deco(x, 1, z, 1.8, 2, 1.8, theme.wall)
        })
        break
      }
      case 'pushers': {
        floor(a, b)
        for (let i = 0; i < 4; i += 1) {
          hazards.push({
            type: 'pusher',
            x: 0,
            z: zAt(a + 7 + i * 11),
            w: 10,
            h: 4,
            d: 3,
            amp: P - 5.5,
            speed: 0.9 + T * 0.12 + rand() * 0.3,
            offset: i * 1.7,
            color: theme.wall2,
          })
        }
        break
      }
      case 'falling': {
        floor(a, b)
        const cols = Math.floor((2 * P) / 4.5)
        let gi = Math.floor(cols / 2)
        for (let r = 0; r < 7; r += 1) {
          gi = clamp(gi + Math.floor(rand() * 3) - 1, 0, cols - 2)
          for (let i = 0; i < cols; i += 1) {
            if (i === gi || i === gi + 1) continue
            hazards.push({
              type: 'falling',
              x: -P + 2.25 + i * 4.5,
              z: zAt(a + 5 + r * 6.5),
              size: 4.2,
              period: 3.8 - T * 0.15 + ((i + r) % 3) * 0.5,
              offset: (i * 0.7 + r * 1.3) % 5,
              color: theme.accent,
            })
          }
        }
        break
      }
      case 'pendulum': {
        floor(a, b)
        for (let i = 0; i < 6; i += 1) {
          hazards.push({
            type: 'pendulum',
            z: zAt(a + 5 + i * 8),
            amp: P - 3.5,
            speed: 0.9 + T * 0.12 + rand() * 0.4,
            offset: i * 1.1,
            w: 4.2,
            h: 3.4,
            d: 2.4,
            color: '#8a5a2b',
          })
        }
        break
      }
      case 'lasers': {
        floor(a, b)
        for (let i = 0; i < 7; i += 1) {
          hazards.push({
            type: 'laser',
            z: zAt(a + 4 + i * 6),
            y: i % 2 === 0 ? 0.5 : 0.9,
            half,
            period: 3.2 - T * 0.12 + (i % 3) * 0.4,
            onFrac: 0.5,
            offset: i * 0.7,
            color: theme.kill,
          })
        }
        break
      }
      case 'collapse': {
        kill(0, -0.4, zc, W, 0.6, L, theme.kill, { glow: true, lava: true })
        rivers.push({ x: 0, z: zc, w: W, d: L, y: -0.65, vx: 1.6, kind: 'lava' })
        floor(a, a + 6)
        floor(b - 6, b)
        const rows = Math.floor((L - 12) / 6)
        const lanes = 4
        const lw = (2 * P) / lanes
        for (let r = 0; r < rows; r += 1) {
          for (let lane = 0; lane < lanes; lane += 1) {
            hazards.push({
              type: 'tile',
              x: -P + (lane + 0.5) * lw,
              y: -0.5,
              z: zAt(a + 6 + r * 6 + 2.5),
              w: lw - 0.8,
              h: 1,
              d: 5,
              period: 8.5 - T * 0.4,
              solidFrac: 0.7 - T * 0.02,
              offset: (r * 0.12 + lane * 0.33) * 7,
              color: theme.wall2,
            })
          }
        }
        break
      }
      case 'tide': {
        kill(0, -0.4, zc, W, 0.6, L, theme.kill, { glow: true, lava: true })
        rivers.push({ x: 0, z: zc, w: W, d: L, y: -0.65, vx: 1.6, kind: 'lava' })
        solid(0, -0.5, zc, 18, 1, L, theme.floor)
        floor(a, a + 6)
        floor(b - 6, b)
        let zi = 0
        for (let dz = a + 6; dz + 12 <= b - 6; dz += 18) {
          hazards.push({ type: 'tide', x: 0, z: zAt(dz + 6), w: 18, d: 12, period: 9, offset: zi * 2.6, color: theme.kill })
          deco(0, 0.05, zAt(dz + 15), 18, 0.1, 5, '#ffe83b')
          zi += 1
        }
        break
      }
      case 'river': {
        floor(a, b)
        for (let i = 0; i < 3; i += 1) {
          const dz = a + 6 + i * 16
          const vx = (i % 2 ? -1 : 1) * (3.5 + T * 0.4)
          currents.push({ x: 0, z: zAt(dz + 5), w: W, d: 10, vx, vz: 0 })
          const side = vx > 0 ? 1 : -1
          for (let sz = 0; sz < 10; sz += 3.3) {
            hazards.push({ type: 'spike', x: side * (P - 1), z: zAt(dz + 1.5 + sz), r: 1.1, h: 3.2 })
          }
        }
        break
      }
      case 'tornado': {
        // Twisters drift across the floor; time your run between them.
        floor(a, b)
        for (let i = 0; i < 2 + T; i += 1) {
          hazards.push({ type: 'tornado', x: 0, z: zAt(a + 8 + i * ((L - 14) / (1 + T))), amp: P - 3, r: 2.4, h: 14, speed: 0.5 + T * 0.08 + rand() * 0.3, offset: i * 1.9 })
        }
        for (let i = 0; i < 6; i += 1) {
          const side = i % 2 ? 1 : -1
          solid(side * (P - 1.5), 0.8, zAt(a + 4 + i * 9), 2.6, 1.6, 2.2, theme.wall2) // tumbled rocks
        }
        break
      }
      case 'buildings': {
        // A city street: weave between buildings with lit windows.
        solid(0, -0.5, zc, W, 1, L, '#3a3f55')
        for (let dz = a + 3; dz < b - 2; dz += 6) deco(0, 0.03, zAt(dz), 0.5, 0.06, 2.6, '#ffffff')
        let gap = 0
        for (let dz = a + 8; dz < b - 6; dz += 11) {
          gap = clamp(gap + (rand() - 0.5) * 16, -(P - 6), P - 6)
          for (const [x0, x1] of [
            [-half, gap - 4.4],
            [gap + 4.4, half],
          ]) {
            if (x1 - x0 < 2) continue
            const bh = 6 + rand() * 9
            const bz = zAt(dz)
            const col = rand() < 0.5 ? theme.wall : theme.wall2
            solid((x0 + x1) / 2, bh / 2, bz, x1 - x0, bh, 5, col)
            deco((x0 + x1) / 2, bh + 0.2, bz, x1 - x0 + 0.4, 0.4, 5.4, theme.accent)
            for (let wy = 1.8; wy < bh - 1; wy += 2.4) {
              for (let wx = x0 + 1.2; wx < x1 - 0.8; wx += 2.2) {
                if (rand() < 0.25) continue
                neon(wx, wy, bz + 2.55, 1, 1.2, 0.1, rand() < 0.7 ? '#ffe98a' : '#8fd8ff')
              }
            }
          }
        }
        break
      }
      case 'jungle': {
        // Dense trees, thorny bushes and swinging logs.
        floor(a, b, '#4fae3a')
        let path = 0
        for (let dz = a + 6; dz < b - 4; dz += 7) {
          path = clamp(path + (rand() - 0.5) * 14, -P * 0.6, P * 0.6)
          for (let x = -(P - 2); x <= P - 2; x += 6) {
            if (Math.abs(x - path) < 5) continue
            const tx = x + (rand() - 0.5) * 1.5
            const tz = zAt(dz + (rand() - 0.5) * 2)
            solid(tx, 3, tz, 1.4, 6, 1.4, '#7a4a26')
            deco(tx, 7, tz, 5, 2.4, 5, rand() < 0.5 ? '#2fae4a' : '#3cc95a')
            deco(tx, 8.8, tz, 3, 1.4, 3, '#4fe06a')
          }
        }
        for (let i = 0; i < 3; i += 1) {
          hazards.push({ type: 'pendulum', z: zAt(a + 10 + i * 15), amp: P - 3.5, speed: 0.9 + T * 0.12 + rand() * 0.3, offset: i * 1.4, w: 4.6, h: 1.6, d: 1.6, color: '#8a5a2b' })
        }
        break
      }
      case 'ice': {
        // Snowfield with ice blocks, snow drifts and icicle blocks dropping from above.
        floor(a, b, '#eaf8ff')
        let gap = 0
        for (let dz = a + 6; dz < b - 4; dz += 9) {
          gap = clamp(gap + (rand() - 0.5) * 14, -(P - 5), P - 5)
          for (let x = -(P - 2); x <= P - 2; x += 5) {
            if (Math.abs(x - gap) < 4.6) continue
            const sz = 2.2 + rand() * 1.1
            const h = 0.55 + rand() * 0.45
            solid(x, h / 2, zAt(dz), sz, h, sz, rand() < 0.5 ? '#9fe0ff' : '#c7efff')
          }
          deco(gap, 0.12, zAt(dz + 4.5), 6, 0.24, 2.5, '#ffffff')
        }
        for (const sx of [-6, 6]) hazards.push({ type: 'falling', x: sx, z: zAt(a + L / 2), size: 3.2, period: 3.6, offset: sx > 0 ? 1.7 : 0, color: '#bff0ff' })
        break
      }

      // ---- Showpiece modules --------------------------------------------------------
      case 'lavaBridge': {
        // A wide plank bridge over a flowing river of lava. Narrower and gappier as stages get harder.
        const rA = a + 5
        const rB = b - 5
        const rl = rB - rA
        const rz = zAt((rA + rB) / 2)
        floor(a, rA)
        floor(rB, b)
        kill(0, k === 1 ? -2 : -1.4, rz, W, 0.6, rl, theme.kill, { glow: true, lava: true })
        rivers.push({ x: 0, z: rz, w: W, d: rl, y: k === 1 ? -1.25 : -0.65, vx: 2.4, kind: 'lava', style: k === 1 ? 'redStone' : undefined })
        const bw = k === 1 ? 22 : pick([16, 12, 9, 7.5, 6.5])
        const gs = pick([0, 0, 2.4, 3, 3.6])
        if (k === 1) {
          // Exactly three small bridge pieces over the lava river.
          const plank = 14
          const spacing = (rl - plank * 3) / 4
          for (let i = 0; i < 3; i += 1) {
            const from = rA + spacing * (i + 1) + plank * i
            solid(0, -0.15, zAt(from + plank / 2), bw, 0.3, plank, i % 2 ? '#eee7d5' : '#8b929b')
            neon(0, 0.04, zAt(from + plank / 2), bw - 1, 0.08, plank - 1, '#ffffff')
          }
        } else {
          let pz = rA
          let n = 0
          while (pz < rB - 0.01) {
            if (gs && n > 0 && n % 7 === 3 && pz + gs < rB - 6) {
              pz += gs // a missing plank section: jump it
              n += 1
              continue
            }
            const pl = Math.min(2, rB - pz)
            solid(0, -0.15, zAt(pz + pl / 2), bw, 0.3, pl, n % 2 ? '#c98a4b' : '#b87a3c')
            pz += pl
            n += 1
          }
        }
        for (const sx of [-1, 1]) {
          const rx = sx * (bw / 2 - 0.15)
          if (T <= 2) solid(rx, 0.45, rz, 0.3, 0.9, rl, theme.wall2) // low rail: you can't slip off
          else deco(rx, 0.45, rz, 0.3, 0.9, rl, theme.wall2)
          neon(rx, 0.98, rz, 0.16, 0.1, rl, '#ffb347')
          for (let dz = rA + 3; dz < rB; dz += 6) solid(rx, 0.8, zAt(dz), 0.5, 1.6, 0.5, theme.accent)
        }
        for (const zz of [rA, rB]) neon(0, 0.04, zAt(zz) + (zz === rA ? 0.3 : -0.3), W, 0.08, 0.5, '#ffb347')
        for (let i = 0; i < T - 1; i += 1) {
          hazards.push({ type: 'lavaBall', z: zAt(rA + 10 + i * ((rl - 16) / Math.max(1, T - 2))), half: P, r: 1.1, height: 7, period: 4 - T * 0.2, offset: i * 1.3, dir: i % 2 ? -1 : 1, color: i % 2 ? '#39ff6b' : '#ff3b1a' })
        }
        break
      }
      case 'greenBridge': {
        // A bridge over flowing green lava. Every so often the lava surges up over a section of it,
        // so cross while it's clear and wait on the stone islands between sections.
        const rA = a + 5
        const rB = b - 5
        const rl = rB - rA
        const rz = zAt((rA + rB) / 2)
        floor(a, rA)
        floor(rB, b)
        kill(0, -1.4, rz, W, 0.6, rl, '#3fe03a', { glow: true, lava: true, cell: '#0d2a14' })
        rivers.push({ x: 0, z: rz, w: W, d: rl, y: -0.65, vx: -2.6, kind: 'toxic' })
        const bw = pick([14, 12, 10, 9, 8])
        const deckL = 14
        const isle = 6
        let q = 0
        let i = 0
        while (q + deckL <= rl) {
          for (let s = 0; s < deckL; s += 2) solid(0, -0.15, zAt(rA + q + s + 1), bw, 0.3, 2, (s / 2) % 2 ? '#7d8da3' : '#6b7a8f')
          hazards.push({ type: 'tide', x: 0, z: zAt(rA + q + deckL / 2), w: bw, d: deckL, period: pick([10, 9.5, 9, 8.5, 8]), offset: i * 2.6, color: '#3dff3a' })
          q += deckL
          if (q + isle + deckL <= rl) {
            solid(0, -0.5, zAt(rA + q + isle / 2), 18, 1, isle, theme.floor)
            deco(0, 0.05, zAt(rA + q + isle / 2), 17, 0.1, isle - 1, '#ffe83b')
            q += isle
          }
          i += 1
        }
        for (const zz of [rA, rB]) neon(0, 0.04, zAt(zz) + (zz === rA ? 0.3 : -0.3), W, 0.08, 0.5, '#7dff3a')
        break
      }
      case 'grandmaRide': {
        // Grandmas in wheelchairs come rolling down the wide hall, weaving side to side. Dodge them.
        floor(a, b)
        deco(0, 0.025, zc, P * 1.6, 0.05, L - 2, theme.accent)
        for (let i = 0; i < 6; i += 1) {
          for (const sx of [-1, 1]) solid(sx * (P - 1.5), 1.2, zAt(a + 5 + i * 9.5), 1.6, 2.4, 1.6, theme.wall2)
        }
        const count = pick([1, 2, 2, 3, 4])
        const period = pick([8.5, 7.5, 6.5, 5.5, 4.5])
        for (let i = 0; i < count; i += 1) {
          hazards.push({
            type: 'granny',
            x: 0,
            zFrom: zAt(b - 2),
            zTo: zAt(a + 1),
            amp: P - 5.5,
            weaves: 1.5,
            phase: i * 2.1,
            period,
            offset: (i * period) / count,
            r: 3.4,
          })
        }
        break
      }
      case 'bigBall': {
        // A giant lava ball rolls down a narrow lane. Duck into a side alcove until it has passed.
        floor(a, b)
        const LH = 5.4 // half-width of the lane (the ball is 10 wide)
        const depth = 5.5 // alcove depth
        const pockets = []
        for (let pdz = a + 12; pdz < b - 9; pdz += 14) pockets.push(pdz)
        const seg = (from, to, fn) => {
          if (to - from > 0.01) fn(from, to)
        }
        for (const sx of [-1, 1]) {
          const bx = sx * (LH + depth + (half + 1 - (LH + depth)) / 2)
          solid(bx, 4.5, zc, half + 1 - (LH + depth), 9, L, theme.wall2) // solid mass behind the alcoves
          let from = a
          const cut = []
          for (const pz of pockets) cut.push([pz - 3.5, pz + 3.5])
          cut.push([b, b])
          for (const [s0, s1] of cut) {
            seg(from, s0, (f, t) => {
              solid(sx * (LH + depth / 2), 3, zAt((f + t) / 2), depth, 6, t - f, theme.wall)
              neon(sx * (LH - 0.1), 6.1, zAt((f + t) / 2), 0.2, 0.2, t - f, '#ffb347')
            })
            from = s1
          }
          for (const pz of pockets) {
            deco(sx * (LH + depth / 2), 0.04, zAt(pz), depth - 0.6, 0.08, 6.4, '#ffe83b')
            neon(sx * (LH + depth - 0.2), 0.5, zAt(pz), 0.2, 1, 6.4, '#ffe83b')
          }
        }
        const cnt = T >= 4 ? 2 : 1
        const period = pick([11, 10, 9, 8, 7.5])
        for (let i = 0; i < cnt; i += 1) {
          hazards.push({
            type: 'boulder',
            x: 0,
            zFrom: zAt(b - 1),
            zTo: zAt(a + 1),
            r: 5,
            kr: 4.3,
            period,
            offset: (i * period) / cnt,
            color: i % 2 ? '#39ff6b' : '#ff3b1a',
            cell: i % 2 ? '#0d2a14' : '#2a0d08',
          })
        }
        break
      }
      case 'hurdles': {
        // Low beams across (and along) the hall: jump over them. Early stages leave a gap to walk round.
        floor(a, b)
        const rows = Math.floor((L - 10) / 7)
        for (let r = 0; r < rows; r += 1) {
          const bz = zAt(a + 7 + r * 7)
          const col = r % 2 ? theme.accent : theme.wall2
          const hole = T <= 2 ? clamp((rand() - 0.5) * 2 * (P - 4), -(P - 4), P - 4) : null
          const parts = hole === null ? [[-P, P]] : [[-P, hole - 2.4], [hole + 2.4, P]]
          for (const [x0, x1] of parts) {
            if (x1 - x0 < 1) continue
            solid((x0 + x1) / 2, 0.5, bz, x1 - x0, 1, 1.3, col)
            neon((x0 + x1) / 2, 1.03, bz, x1 - x0, 0.06, 0.5, '#ffffff')
          }
          if (T >= 2 && r % 2 === 0) {
            const lx = clamp((rand() - 0.5) * 2 * (P - 4), -(P - 4), P - 4)
            solid(lx, 0.5, zAt(a + 7 + r * 7 + 3.5), 1.3, 1, 5, theme.wall)
            neon(lx, 1.03, zAt(a + 7 + r * 7 + 3.5), 0.5, 0.06, 5, '#ffffff')
          }
        }
        break
      }
      default:
        floor(a, b)
    }
    d = b
  }

  // --- Stage 1 intro room (between the lobby gate and the course) --------------
  const ceil = { from: z0, to: 0 }
  if (k === 1) {
    const i0 = -LOBBY_HALF - LOBBY_WALL // starts behind the lobby wall so the two never share a face
    const ic = (i0 + z0) / 2
    const il = i0 - z0
    ceil.from = i0
    solid(0, -0.5, ic, W, 1, il, '#2b6cff')
    solid(-half - 1, WALL_H / 2, ic, 2, WALL_H, il, theme.wall)
    solid(half + 1, WALL_H / 2, ic, 2, WALL_H, il, theme.wall)
    // Golden arch over the course entrance.
    solid(-half + 1.5, WALL_H / 2, z0 - 1, 3, WALL_H, 2, '#ffc21a')
    solid(half - 1.5, WALL_H / 2, z0 - 1, 3, WALL_H, 2, '#ffc21a')
    solid(0, WALL_H - 2, z0 - 1, W, 4, 2, '#ffc21a')
    pushIntroSigns(signs, 1, z0 + 0.2, 'arch')
  }

  // --- Safe room after the course ----------------------------------------------
  //   entry: narrower doorway framed in blue, "Safe Zone" above it
  //   left : yellow RETURN pad (+wins, back to lobby)
  //   right: red BONUS pad (2x wins) behind a lava strip + divider -> needs a jump
  //   front: door (left half) to the next stage, with the next stage's title above it
  const s0 = zEnd
  const s1 = zEnd - SAFE_ROOM_LEN
  const sc = (s0 + s1) / 2
  ceil.to = s1
  solid(0, -0.5, sc, W, 1, SAFE_ROOM_LEN, '#2b6cff')
  solid(-half + 2, 0.65, sc, 4, 1.3, SAFE_ROOM_LEN, '#1f5fe0')
  solid(half - 2, 0.65, sc, 4, 1.3, SAFE_ROOM_LEN, '#1f5fe0')

  if (k === 2) {
    // Stage 2's safe zone is a small brick rest stop, not another empty platform.
    const brickColors = ['#d63b3b', '#eee7d5', '#8b5a3c']
    for (let z = s0 - 5, i = 0; z > s1 + 5; z -= 5, i += 1) {
      const color = brickColors[i % brickColors.length]
      for (const side of [-1, 1]) {
        solid(side * (half - 1.2), 2.5, z, 2.2, 5, 4.1, color)
        deco(side * (half - 0.05), 4.2, z, 0.16, 0.22, 3.5, '#fff4c2', { neon: true })
      }
    }
  }

  for (const sx of [-1, 1]) solid(sx * 7, 3, s0 - 1, 2, 6, 2, '#1d4fb8')
  solid(0, 6.5, s0 - 1, 16, 1.5, 2, '#1d4fb8')
  for (const sx of [-1, 1]) deco(sx * 7, 4.5, s0 + 0.1, 0.8, 9, 0.5, '#2bc4ff')
  deco(0, 9, s0 + 0.1, 14.8, 0.8, 0.5, '#2bc4ff')

  // Wins pads either side of the exit door (press E on one), open floor between them. The right
  // one pays double but stays locked until you hold BONUS_PAD_MIN_WINS wins.
  const returnPad = { x: -13, z: s1 + 6, w: 9, d: 8, wins: def.wins, bonus: false, minWins: 0 }
  const bonusPad = { x: 13, z: s1 + 6, w: 9, d: 8, wins: def.wins * 2, bonus: true, minWins: BONUS_PAD_MIN_WINS }

  signs.push({ kind: 'safe', x: 0, y: 13.5, z: s0 + 0.15 })
  signs.push({ kind: 'tip', x: -half + 0.15, y: 7, z: s0 - 22 })

  const gateHalf = 7
  const last = k === STAGE_COUNT
  if (last) {
    solid(0, 6.5, s1 - 1, W * 0.55, 1.5, 2, '#ffc21a')
    for (const sx of [-1, 1]) solid(sx * (W * 0.275), 3, s1 - 1, 2, 6, 2, '#ffc21a')
    signs.push({ kind: 'finale', x: 0, y: 9, z: s1 + 0.2, text: 'YOU ESCAPED!', emoji: '🏆' })
  } else {
    // One simple boundary wall between stages with a single decorated gate opening.
    const wallHalf = half + 1
    const sideWidth = wallHalf - gateHalf
    for (const sx of [-1, 1]) {
      solid(sx * (gateHalf + sideWidth / 2), WALL_H / 2, s1 - 1, sideWidth, WALL_H, 2, theme.wall)
      solid(sx * gateHalf, 4.5, s1 - 1.1, 1.4, 9, 2.5, theme.wall2)
      deco(sx * gateHalf, 4.5, s1 - 2.35, 0.24, 8.5, 0.16, theme.accent, { neon: true })
    }
    solid(0, 9 + (WALL_H - 9) / 2, s1 - 1, gateHalf * 2, WALL_H - 9, 2, theme.wall)
    solid(0, WALL_H - 1.2, s1 - 1.1, gateHalf * 2 + 3, 1.2, 2.5, theme.wall2)
    deco(0, WALL_H - 2.2, s1 - 2.35, gateHalf * 2, 0.25, 0.16, theme.accent, { neon: true })
    pushIntroSigns(signs, k + 1, s1 + 0.2, 'wall')
  }

  return {
    k,
    theme,
    def,
    z0,
    zEnd,
    len,
    boxes,
    hazards,
    gates,
    signs,
    currents,
    rivers,
    ceil,
    returnPad,
    bonusPad,
    barrier: last ? null : { x: 0, z: s1 - 2.35, w: gateHalf * 2 - 0.35, h: 8.3, color: theme.accent },
    safe: { z0: s0, z1: s1 },
    next: last ? null : { z: s1 - 2 },
  }
}

/** Every stage, built once. */
let _stages = null
export function allStages() {
  if (!_stages) {
    _stages = [null]
    for (let k = 1; k <= STAGE_COUNT; k += 1) _stages.push(buildStage(k))
  }
  return _stages
}

/** True when (x,z) is inside a pad rectangle. */
export function inPad(pad, x, z, slack = 0) {
  return Math.abs(x - pad.x) <= pad.w / 2 + slack && Math.abs(z - pad.z) <= pad.d / 2 + slack
}

/** True when (x,z) is on treadmill `t` (a LOBBY.treadmills entry). */
export function onTreadmill(t, x, z, slack = 0) {
  return Math.abs(x - t.x) <= t.l / 2 + slack && Math.abs(z - t.z) <= t.w / 2 + slack
}

/* ------------------------------------------------------------------ */
/* Hazard kinematics (shared so every client sees the same thing)       */
/* ------------------------------------------------------------------ */

const frac = (v) => v - Math.floor(v)

export function rollerPos(h, t) {
  const p = frac((t + h.offset) / h.period)
  return { x: h.x, y: h.r, z: h.zFrom + (h.zTo - h.zFrom) * p, spin: p * ((h.zFrom - h.zTo) / h.r) }
}

/** Wave: travels from zFrom to zTo during `travel` secs, then rests until period ends. */
export function wavePos(h, t) {
  const p = frac((t + h.offset) / h.period) * h.period
  if (p > h.travel) return null
  return { z: h.zFrom + (h.zTo - h.zFrom) * (p / h.travel) }
}

/** Wheelchair grandma rolling down the hall, weaving side to side. Returns { x, z, yaw }. */
export function grannyPos(h, t) {
  const at = (tt) => {
    const p = frac((tt + h.offset) / h.period)
    return { x: h.x + Math.sin(p * Math.PI * 2 * h.weaves + h.phase) * h.amp, z: h.zFrom + (h.zTo - h.zFrom) * p }
  }
  const n = at(t)
  const m = at(t + 0.05)
  return { x: n.x, z: n.z, yaw: Math.atan2(m.x - n.x, m.z - n.z) }
}

/** Tornado: drifts side to side across the corridor. */
export function tornadoX(h, t) {
  return h.x + Math.sin((t + h.offset) * h.speed) * h.amp
}

/** Lava ball leaping across the corridor in an arc. Returns { x, y }, or null while it's under. */
export function lavaBallPos(h, t) {
  const p = frac((t + h.offset) / h.period)
  if (p > 0.8) return null
  const q = p / 0.8
  return { x: h.dir * (-h.half + 2 * h.half * q), y: h.r + 4 * h.height * q * (1 - q) }
}

export function sweeperAngle(h, t) {
  return (t + h.offset) * h.speed
}

export function pusherX(h, t) {
  return h.x + Math.sin((t + h.offset) * h.speed) * h.amp
}

export function pendulumX(h, t) {
  return Math.sin((t + h.offset) * h.speed) * h.amp
}

export function laserOn(h, t) {
  return frac((t + h.offset) / h.period) < h.onFrac
}

/** Collapsing bridge tile: solid, shaking just before it drops, then gone until it rebuilds. */
export function tileState(h, t) {
  const p = frac((t + h.offset) / h.period)
  if (p < h.solidFrac - 0.15) return { solid: true, warn: false }
  if (p < h.solidFrac) return { solid: true, warn: true }
  return { solid: false, warn: false }
}

/** Lava tide over a walkway: `level` is the lava surface height (<0 = hidden). */
export function tideLevel(h, t) {
  const p = frac((t + h.offset) / h.period)
  if (p < 0.5) return { level: -1, warn: false }
  if (p < 0.62) return { level: -1, warn: true }
  if (p < 0.67) return { level: -1 + (2.4 * (p - 0.62)) / 0.05, warn: false }
  if (p < 0.92) return { level: 1.4, warn: false }
  return { level: 1.4 - (2.4 * (p - 0.92)) / 0.08, warn: false }
}

/** Falling block: y height over the cycle. Returns { y, warn, landed }. */
export function fallingState(h, t) {
  const p = frac((t + h.offset) / h.period)
  // 0..0.45 warn (block up high), 0.45..0.6 fall, 0.6..0.85 sit on ground, rest rise.
  if (p < 0.45) return { y: 14, warn: true, landed: false }
  if (p < 0.6) {
    const q = (p - 0.45) / 0.15
    return { y: 14 - 14 * q * q, warn: true, landed: false }
  }
  if (p < 0.85) return { y: h.size / 2, warn: false, landed: true }
  const q = (p - 0.85) / 0.15
  return { y: h.size / 2 + q * 14, warn: false, landed: false }
}
