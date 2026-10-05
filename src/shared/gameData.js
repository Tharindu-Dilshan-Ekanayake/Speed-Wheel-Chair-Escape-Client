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
export const BONUS_PAD_MIN_REBIRTHS = 2

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
/** Stage corridors leave room to dodge without stretching the scenery into a sparse hallway. */
export const CORRIDOR_W = 44
export const GATE_W = 18
export const WALL_H = 20
export const STAGE_GATE_H = 16
/** Width of every safe-room/stage doorway. Entry barriers use this exact opening. */
export const STAGE_DOOR_W = 14
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

export const THEMES = [
  null,
  { name: 'Azure Archipelago', mascot: '🌊', floor: '#14c9ef', wall: '#087eee', wall2: '#0755bb', accent: '#72faff', sky: '#91dcf0', kill: '#148eaf', scenery: 'palm', outdoor: false, cell: '#256e78' },
  { name: 'Ember Canyon', mascot: '🔥', floor: '#a8abd5', wall: '#ee302c', wall2: '#ffcb16', accent: '#ffef4d', sky: '#f3a98f', kill: '#ff392a', scenery: 'rock', outdoor: false, cell: '#702d3a' },
  { name: 'Jade Caldera', mascot: '☢️', floor: '#08cfa2', wall: '#039473', wall2: '#075443', accent: '#65ff10', sky: '#9bd6b1', kill: '#56ff35', scenery: 'crystal', outdoor: false, cell: '#174b49' },
  { name: 'Canopy Expedition', mascot: '🌿', floor: '#78d948', wall: '#238949', wall2: '#105b38', accent: '#eaff47', sky: '#b5e2bf', kill: '#2eb5a2', scenery: 'tree', outdoor: false, cell: '#33694e' },
  { name: 'Coral Tsunami Coast', mascot: '🌊', floor: '#08d8f7', wall: '#0487f1', wall2: '#0661bf', accent: '#74ffff', sky: '#98ddff', kill: '#2da5e5', scenery: 'palm', outdoor: false, cell: '#277994' },
  { name: 'Amethyst Stormlands', mascot: '🌪️', floor: '#a178ec', wall: '#5535a5', wall2: '#8a59d5', accent: '#eacdff', sky: '#b7b4dc', kill: '#ad8fff', scenery: 'rock', outdoor: true, cell: '#534678' },
  { name: 'Emerald Underworld', mascot: '🌳', floor: '#a5db39', wall: '#148953', wall2: '#075338', accent: '#ffe037', sky: '#bee6d4', kill: '#ff986b', scenery: 'tree', outdoor: false, cell: '#3d685b' },
  { name: 'Glacier Cathedral', mascot: '❄️', floor: '#94ecff', wall: '#247fce', wall2: '#50cfff', accent: '#ddffff', sky: '#bbddf4', kill: '#79b8ff', scenery: 'crystal', outdoor: false, cell: '#4895bc', snow: true },
  { name: 'Neon Night Run', mascot: '💠', floor: '#7355d4', wall: '#382977', wall2: '#b434d4', accent: '#ff63e1', sky: '#586d9f', kill: '#ff4caa', scenery: 'tower', outdoor: false, cell: '#243451' },
  { name: 'Sunken Observatory', mascot: '🌉', floor: '#23cfcb', wall: '#117cc0', wall2: '#075489', accent: '#d4ff36', sky: '#a9dce0', kill: '#329bbe', scenery: 'ruin', outdoor: false, cell: '#387d85' },
  { name: 'Amber Fossil Vault', mascot: '🪨', floor: '#e8ac4c', wall: '#b8571c', wall2: '#ffbf17', accent: '#ffef6a', sky: '#f4d6ab', kill: '#e58336', scenery: 'rock', outdoor: false, cell: '#8c603e' },
  { name: 'Rose Quartz Foundry', mascot: '🌸', floor: '#f390ce', wall: '#b54eaf', wall2: '#8340ba', accent: '#ffff8a', sky: '#edc8e1', kill: '#ee709d', scenery: 'tree', outdoor: false, cell: '#697ea0' },
  { name: 'Sapphire Rapids', mascot: '💧', floor: '#18cbdc', wall: '#176ed5', wall2: '#1051a8', accent: '#7cfff0', sky: '#a1d9ee', kill: '#228cf0', scenery: 'crystal', outdoor: false, cell: '#367993' },
  { name: 'Cloudstep Summit', mascot: '☁️', floor: '#c1bdf6', wall: '#6556c7', wall2: '#9985ee', accent: '#ffe18b', sky: '#cad2f3', kill: '#8b9fe8', scenery: 'ruin', outdoor: true, cell: '#828bb9' },
  { name: 'Aurora Sky Docks', mascot: '👑', floor: '#ffc82f', wall: '#6841c4', wall2: '#ae64e8', accent: '#fff27c', sky: '#94bfd0', kill: '#a272ff', scenery: 'tower', outdoor: false, cell: '#394e76' },
  {"name":"Obsidian Geysers","mascot":"✦","floor":"#ff682a","wall":"#622337","wall2":"#291b30","accent":"#ffdf78","sky":"#b5cfea","kill":"#ff682a","scenery":"rock","outdoor":true,"cell":"#291b30"},
  {"name":"Clockwork Crossing","mascot":"✦","floor":"#ffcd57","wall":"#44667b","wall2":"#223746","accent":"#8dfff3","sky":"#b5cfea","kill":"#ffcd57","scenery":"tower","outdoor":true,"cell":"#223746"},
  {"name":"Moonstone Viaduct","mascot":"✦","floor":"#adcaff","wall":"#574583","wall2":"#312953","accent":"#dcfffa","sky":"#b5cfea","kill":"#adcaff","scenery":"crystal","outdoor":true,"cell":"#312953"},
  {"name":"Scarlet Floodplain","mascot":"✦","floor":"#ff9848","wall":"#932c4d","wall2":"#421f3a","accent":"#ffe36b","sky":"#b5cfea","kill":"#ff9848","scenery":"ruin","outdoor":true,"cell":"#421f3a"},
  {"name":"Celestial Crown","mascot":"✦","floor":"#c9aaff","wall":"#473191","wall2":"#26164e","accent":"#fff19a","sky":"#b5cfea","kill":"#c9aaff","scenery":"tower","outdoor":true,"cell":"#26164e"},
]

/** One signature adventure per stage; safe finish landings lead into enclosed rest rooms. */
export const STAGES = [
  null,
  { rec: 1, wins: 1, tp: 0, adventure: 'River Boardwalk', hint: 'Jump onto the three wide bridges, then reach the finish.', modules: ['boardwalk', 'finish'] },
  { rec: 2, wins: 2, tp: 5, adventure: 'Molten Stepping Stones', hint: 'Jump the gaps. The red lava below is deadly.', modules: ['ember', 'finish'] },
  { rec: 3, wins: 3, tp: 10, adventure: 'Emerald Floodgates', hint: 'Wait on gold islands while the green lava rises.', modules: ['jade', 'finish'] },
  { rec: 4, wins: 5, tp: 20, adventure: 'Carry the Canopy', hint: 'Hold SHIFT / CARRY, then jump up the tall stairs.', modules: ['portage', 'finish'] },
  { rec: 5, wins: 8, tp: 35, adventure: 'Tsunami Runaway', hint: 'Dodge the left-to-right wave, rest in the refuge, then outrun the right-to-left wave to the safe room.', modules: ['tsunami', 'finish'] },
  { rec: 6, wins: 12, tp: 55, adventure: 'Tornado Chase', hint: 'A tornado is chasing you down the storm road. Keep moving and dodge its pull.', modules: ['twisters', 'finish'] },
  { rec: 7, wins: 18, tp: 80, adventure: 'Broken Bridge Crossing', hint: 'Cross the water on the narrow bridges. They shake, collapse, and drop you into the river.', modules: ['timber', 'finish'] },
  { rec: 8, wins: 25, tp: 110, adventure: 'Sunken Observatory', hint: 'Cross the flooded star chamber, ride the turning sky platforms, and reach the observatory.', modules: ['observatory', 'finish'] },
  { rec: 9, wins: 35, tp: 150, adventure: 'Prism Pulse', hint: 'Wait for the laser beams to switch off.', modules: ['pulse', 'finish'] },
  { rec: 10, wins: 50, tp: 200, adventure: 'The Vanishing Bridge', hint: 'Cross fading tiles. Rest on the permanent gold islands.', modules: ['vanish', 'finish'] },
  { rec: 11, wins: 70, tp: 260, adventure: 'Rolling Boulder Run', hint: 'Watch the warning lanes and dodge the rolling boulders.', modules: ['boulderRun', 'finish'] },
  { rec: 12, wins: 95, tp: 330, adventure: 'Pink River Switchback', hint: 'Go straight, turn right, then left across the disappearing bridge to reach the safe room.', modules: ['windmills', 'finish'] },
  { rec: 13, wins: 130, tp: 420, adventure: 'Flash Flood Escape', hint: 'The road floods! Climb the mint refuges before the water rises.', modules: ['rapids', 'finish'] },
  { rec: 14, wins: 175, tp: 520, adventure: 'Skyward Portage', hint: 'Carry your chair up the cloud stairs. Jump between terraces.', modules: ['cloudsteps', 'finish'] },
  { rec: 15, wins: 250, tp: 650, adventure: 'Aurora Lift Expedition', hint: 'Board the rising lifts, jump onto the sky docks, then descend to the next lift.', modules: ['aurora', 'finish'] },
  {"rec":16,"wins":350,"tp":800,"adventure":"Geyser Causeway","hint":"Time your crossing between the leaping lava jets.","modules":["geysers","finish"]},
  {"rec":17,"wins":500,"tp":950,"adventure":"Clockwork Pendulums","hint":"Cross behind swinging hammers; gold platforms are rest bays.","modules":["hammers","finish"]},
  {"rec":18,"wins":650,"tp":1100,"adventure":"Moonstone Switchbacks","hint":"Follow the alternating balconies and jump over the sweeping arms.","modules":["orbit","finish"]},
  {"rec":19,"wins":800,"tp":1250,"adventure":"Scarlet Deluge","hint":"The red lava floods the road. Reach the tall gold refuges.","modules":["redFlood","finish"]},
  {"rec":20,"wins":950,"tp":1400,"adventure":"Celestial Final Ascent","hint":"Ride the lifts and carry your chair onto the final crown terraces.","modules":["crown","finish"]},
]

export function stageTier(k) { return Math.min(5, Math.ceil(k / 3)) }
export const STAGE_COUNT = STAGES.length - 1

/** Progression gates use earned levels across rebirths and the equipped chair. */
export function stageRequirement(k) {
  const move = [0, 0, 0, 0, 2, 2, 2, 4, 4, 4, 6, 6, 8, 8, 10, 13, 13, 13, 16, 16, 16][k] ?? 0
  return { level: STAGES[k]?.rec || 1, chair: CHAIRS.find((c) => c.move >= move) || CHAIRS[0] }
}
export function stageAccess(profile, k) {
  if (!STAGES[k]) return null
  const req = stageRequirement(k)
  if ((profile.totalLevel || profile.level || 1) < req.level) return `Reach Level ${req.level}`
  if ((chairById(profile.chair)?.move || 0) < req.chair.move) return `Equip ${req.chair.name} or better`
  return null
}

export function newExpedition(devStage = 0) {
  return { tool: null, dug: {}, devStage, lastDig: 0 }
}
/** Shared, authority-side tool/dig rules for multiplayer and offline play. */
export function expeditionAction(expedition, pos, action, id, now = Date.now()) {
  const stages = allStages()
  if (action === 'pickup') {
    const rack = stages[Number(id)]?.toolRack
    if (!rack || Math.hypot(pos.x - rack.x, pos.z - rack.z) > 4 || Math.abs(pos.y - rack.y) > 3) return 'Move closer to the tool rack'
    expedition.tool = 'pickaxe'
    return null
  }
  if (action !== 'dig') return 'Unknown interaction'
  const site = stages.flatMap((s) => s?.digSites || []).find((s) => s.id === id)
  if (!site || Math.abs(pos.x - site.x) > site.w / 2 || Math.abs(pos.z - site.z) > 4 || Math.abs(pos.y - (site.y - 2)) > 3) return 'Move closer to the excavation'
  if (expedition.tool !== 'pickaxe') return 'Pick up a pickaxe in the previous safe room'
  if (now - expedition.lastDig < 450) return 'Wait for your next swing'
  expedition.lastDig = now
  expedition.dug[site.id] = Math.min(site.hits, (expedition.dug[site.id] || 0) + 1)
  return null
}
export function excavationComplete(expedition, k) {
  return allStages()[k]?.digSites.every((s) => (expedition?.dug[s.id] || 0) >= s.hits) ?? true
}
export function blockedExcavation(expedition, pos) {
  const region = regionAtZ(pos.z)
  return allStages()[region.stage]?.digSites.some((s) => pos.z < s.z - 1 && (expedition?.dug[s.id] || 0) < s.hits) || false
}
export function canPush(a, b, now = Date.now()) {
  if (!a || !b || a === b || now < (a.pushReadyAt || 0) || now < (b.pushImmuneUntil || 0)) return false
  const ra = regionAtZ(a.pos.z), rb = regionAtZ(b.pos.z)
  if (!ra.inCourse || !rb.inCourse || ra.stage !== rb.stage) return false
  const s = allStages()[ra.stage]
  if (a.pos.z > s.z0 - 10 || b.pos.z > s.z0 - 10 || a.pos.z < s.zEnd + 6 || b.pos.z < s.zEnd + 6) return false
  const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z
  const distance = Math.hypot(dx, dz)
  if (distance > 3.1 || Math.abs(a.pos.y - b.pos.y) > 1.8) return false
  // Reject a push through a static wall or excavation seal.
  const obstacles = [...s.boxes.filter((box) => box.kind === 'solid'), ...s.digSites.filter((site) => (a.expedition?.dug[site.id] || 0) < site.hits || (b.expedition?.dug[site.id] || 0) < site.hits)]
  for (let t = 0.15; t < 1; t += 0.15) {
    const x = a.pos.x + dx * t, z = a.pos.z + dz * t, y = a.pos.y + (b.pos.y - a.pos.y) * t
    if (obstacles.some((box) => Math.abs(x - box.x) < box.w / 2 && Math.abs(z - box.z) < box.d / 2 && Math.abs(y - box.y) < box.h / 2)) return false
  }
  return true
}
const MODULE_LEN = { finish: 18, boardwalk: 148, ember: 156, jade: 164, portage: 160, tsunami: 188, twisters: 180, timber: 172, glacier: 180, observatory: 180, pulse: 184, vanish: 188, boulderRun: 192, windmills: 184, rapids: 192, cloudsteps: 200, aurora: 224, geysers: 216, hammers: 224, orbit: 232, redFlood: 240, crown: 248 }

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

/** Keep every stage on one straight centre line so the course is easy to read. */
export function stageCenterX() {
  return 0
}

/** Spawn point at the start of stage k (just inside its intro room). */
export function stageSpawn(k) {
  if (k <= 0) return { ...LOBBY_SPAWN }
  return { x: stageCenterX(k), y: 1.5, z: stageStartZ(k) - 3, yaw: Math.PI }
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
function pushIntroSigns(signs, k, z, centerX = 0) {
  const t = THEMES[k]
  signs.push({ kind: 'mascot', x: centerX, y: 5.7, z: z + 0.8, emoji: t.mascot, arrow: !!t.arrow, color: t.accent, stage: k })
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
  const boxes = []
  const hazards = []
  const gates = []
  const signs = []
  const currents = []
  const rivers = []

  const z0 = stageStartZ(k)
  const zEnd = stageEndZ(k)
  const len = z0 - zEnd
  const routeX = stageCenterX(k)
  const nextX = k < STAGE_COUNT ? stageCenterX(k + 1) : routeX
  const exitX = nextX - routeX
  // Safe rooms use the exact same width as the stages. Keeping both widths
  // identical makes the whole expedition feel like one clean, straight lane.
  const safeWidth = W
  const safeCenter = 0

  const solid = (x, y, z, w, h, d, color, extra) =>
    boxes.push({ x, y, z, w, h, d, color, kind: 'solid', ...extra })
  const deco = (x, y, z, w, h, d, color, extra) =>
    boxes.push({ x, y, z, w, h, d, color, kind: 'deco', ...extra })
  const kill = (x, y, z, w, h, d, color, extra) => {
    boxes.push({ x, y, z, w, h, d, color, kind: 'kill', cell: theme.cell, ...extra })
  }
  const zAt = (dist) => z0 - dist
  const floor = (from, to, color = theme.floor) =>
    solid(0, -0.5, zAt((from + to) / 2), W, 1, to - from, color)
  const neon = (x, y, z, w, h, depth, color = theme.accent) =>
    deco(x, y, z, w, h, depth, color, { neon: true })
  const deck = (x, from, to, width = 12, top = 0, color = theme.floor) => {
    solid(x, top - 0.5, zAt((from + to) / 2), width, 1, to - from, color)
    for (const side of [-1, 1]) neon(x + side * (width / 2 - 0.2), top + 0.04, zAt((from + to) / 2), 0.15, 0.08, to - from)
  }
  const bridge = (x, from, to, width, color) => {
    deck(x, from, to, width, 0, color)
    const center = (from + to) / 2
    const length = to - from
    // Make the bridge readable from the approach: rails and a contrasting frame
    // sit above the deck, while the supports stop safely above the kill volume.
    for (const side of [-1, 1]) {
      const railX = x + side * (width / 2 - 0.45)
      deco(railX, 0.8, zAt(center), 0.28, 1.6, length, theme.accent, { neon: true })
      for (const end of [from + 1, to - 1]) {
        deco(railX, 0.2, zAt(end), 0.38, 0.4, 0.38, '#fff27c', { neon: true })
      }
      deco(railX, -1.5, zAt(center), 0.7, 2.2, 0.7, theme.wall2)
    }
    deco(x, -1.15, zAt(center), width - 1, 0.35, length - 1, theme.wall2)
  }
  const river = (from, to, kind = 'water') => {
    const color = kind === 'water' ? '#168bb7' : kind === 'toxic' ? '#57ee38' : kind === 'pink' ? '#ff4f9a' : '#ff4226'
    kill(0, -3.8, zAt((from + to) / 2), W, 0.6, to - from, color, { lava: kind !== 'water' && kind !== 'pink', cause: kind === 'water' || kind === 'pink' ? 'water' : 'lava' })
    const surface = { x: 0, z: zAt((from + to) / 2), w: W, d: to - from, y: -3.45, vx: kind === 'toxic' ? -2 : 2, kind }
    rivers.push(surface)
    return surface
  }
  const flood = (from, to, kind, period) => {
    const surface = river(from, to, kind)
    const tide = { type: 'tide', x: surface.x, z: surface.z, w: surface.w, d: surface.d, lowY: surface.y, highY: 2.8, period, offset: 0, cause: kind === 'water' ? 'water' : 'lava' }
    // Rendering and damage share this river's exact surface height and footprint.
    surface.tide = tide
    hazards.push(tide)
  }
  const instruction = (text, dist, x = 0) => signs.push({ kind: 'instruction', x, y: 5.5, z: zAt(dist), text, color: theme.accent })
  const carryZones = []
  const digSites = []
  const toolRack = [10].includes(k) ? { x: exitX - 18, y: 1, z: zEnd - 18, stage: k + 1 } : null

  floor(0, 8)
  instruction(`${theme.name}\n${def.hint}`, 6)
  // Tall studded chambers with alternating checker panels. Storm and summit keep open roofs.
  for (const side of [-1, 1]) {
    for (let q = 0, panel = 0; q < len; q += 12, panel++) {
      const depth = Math.min(12, len - q)
      solid(side * (half + 1), (WALL_H - 4) / 2, zAt(q + depth / 2), 2, WALL_H + 4, depth, panel % 2 ? theme.wall : theme.wall2, { checker: panel % 2 === 0 })
      // Keep inset wall trim a few centimetres clear of the wall face; coincident
      // surfaces from different materials caused visible z-fighting.
      deco(side * (half - 0.5), WALL_H / 2, zAt(q + 1), 0.88, WALL_H, 2, theme.wall2)
    }
    if (!theme.outdoor) continue
    for (let dist = 12; dist < len; dist += 16) {
      const x = side * (half + 4 + rand() * 3)
      const h = 5 + rand() * 9
      const z = zAt(dist)
      if (theme.scenery === 'tree' || theme.scenery === 'palm') {
        deco(x, h / 2, z, 1.4, h, 1.4, '#79583f')
        deco(x, h, z, 8, 3, 7, theme.wall2)
        deco(x + side * 1.2, h + 2, z, 5, 2.5, 5, theme.accent)
      } else {
        deco(x, h / 2, z, 4 + rand() * 3, h, 5, theme.wall2)
        deco(x, h + 0.4, z, 3.5, 0.8, 4, theme.accent, { neon: theme.scenery === 'crystal' })
        if (theme.scenery === 'tower') neon(x - side * 2.1, h / 2, z, 0.2, h, 1)
      }
    }
  }

  let d = 8
  for (const mod of def.modules) {
    const L = MODULE_LEN[mod]
    const a = d
    const b = d + L
    switch (mod) {
      case 'finish':
        floor(a, b)
        break
      case 'boardwalk': {
        river(a, b)
        const bridgeCount = 3
        // A level-1 Classic Chair jumps about 4.6m: 2m gaps leave generous timing room.
        const gap = 2
        const segment = L / bridgeCount
        for (let i = 0; i < bridgeCount; i++) {
          const edge = a + i * segment
          const end = i === bridgeCount - 1 ? b : a + (i + 1) * segment
          bridge(0, edge + gap, end, 20, i % 2 ? theme.floor : '#64edff')
          neon(0, 0.05, zAt(edge - 0.8), 18, 0.1, 0.5, '#fff27c')
          instruction(`BRIDGE ${i + 1} / ${bridgeCount}\nJUMP across the small gap`, edge - 2)
        }
        break
      }
      case 'ember': {
        river(a, b, 'lava')
        deck(0, a, a + 10, W)
        for (let q = a + 12, i = 0; q < b - 8; q += 11, i++) {
          deck(Math.sin(i * 0.7) * 4, q, Math.min(q + 9, b - 6), 24, 0, i % 2 ? '#adb7e7' : '#969ecc')
        }
        deck(0, b - 8, b, W)
        break
      }
      case 'redFlood':
      case 'jade': {
        flood(a, b, mod === 'redFlood' ? 'lava' : 'toxic', mod === 'redFlood' ? 15 : 22)
        deck(0, a, b, 18)
        for (let q = a + 10, i = 0; q < b - 10; q += 24, i++) {
          const refugeX = i % 2 ? 12 : -12
          for (let step = 0; step < 3; step++) deck(refugeX, q + step * 2, q + (step + 1) * 2, 8, (step + 1) * 1.2, '#efff37')
          deck(refugeX, q + 6, Math.min(q + 14, b), 8, 3.6, '#efff37')
          signs.push({ kind: 'instruction', x: refugeX, y: 5.8, z: zAt(q + 8), text: 'HIGH GROUND', color: theme.accent })
          for (const side of [-1, 1]) {
            const x = side * 17
            const z = zAt(q + 5)
            deco(x, -1.8, z, 2.7, 3.2, 2.7, '#ffda16', { barrel: true })
            for (const y of [-2.8, -0.8]) deco(x, y, z, 2.82, 0.32, 2.82, '#252b32', { barrel: true })
            deco(x, -0.16, z, 2.3, 0.1, 2.3, '#68ff00', { barrel: true, neon: true })
          }
        }
        break
      }
      case 'portage':
      case 'cloudsteps': {
        river(a, b, 'water')
        deck(0, a, a + 10, W)
        const cycles = mod === 'portage' ? 3 : 4
        const segment = (L - 20) / cycles
        for (let i = 0; i < cycles; i++) {
          const from = a + 10 + i * segment
          const width = mod === 'portage' ? 14 : 12
          for (let j = 0; j < 6; j++) {
            const height = [0, 1.8, 3.2, 3.2, 1.8, 0][j]
            deck(0, from + j * segment / 6, from + (j + 1) * segment / 6 + 0.2, width, height, j % 2 ? theme.wall2 : theme.floor)
          }
        }
        deck(0, b - 10, b, W)
        carryZones.push({ x: 0, z: zAt((a + b) / 2), w: W, d: L })
        instruction('HOLD SHIFT / CARRY + JUMP\nLift your chair over the tall steps', a + 9)
        break
      }
      case 'tsunami': {
        floor(a, b)
        // The whole course is flooded. The water is a visual cover over the
        // floor; the moving wave walls are the deadly parts of this stage.
        rivers.push({ x: 0, z: zAt((a + b) / 2), w: W, d: b - a, y: 0.08, vx: 1.8, kind: 'water' })
        // Wave after wave sweeps across the full course. The staggered offsets
        // keep the tsunami sequence continuous instead of leaving long pauses.
        const refuge = a + 88
        const refugeZ = zAt(refuge)
        deck(0, refuge - 6, refuge + 6, 16, 1.1, '#d9ffff')
        deco(0, 3.2, refugeZ, 15, 4.2, 0.35, '#8beeff', { neon: true })
        for (const side of [-1, 1]) deco(side * 6.7, 2.3, refugeZ, 0.7, 2.8, 8.5, '#62dff5', { neon: true })
        signs.push({ kind: 'instruction', x: 0, y: 5.4, z: zAt(refuge + 1), text: 'SAFE REFUGE  ·  WAIT FOR THE NEXT WAVE', color: '#d9ffff' })
        const waveDistances = [48, 76, 104, 132, 160]
        waveDistances.forEach((distance, i) => {
          const leftToRight = i % 2 === 0
          hazards.push({
            type: 'wave', axis: 'x', x: 0, z: zAt(a + distance),
            xFrom: leftToRight ? -26 : 26, xTo: leftToRight ? 26 : -26,
            period: 18, warn: 3, travel: 9, offset: i * 3,
            half: 18, triggerOnEntry: true,
            shelters: [{ x: 0, z: refugeZ, w: 16, d: 12 }],
          })
        })
        signs.push({ kind: 'instruction', x: 0, y: 5.2, z: zAt(a + 12), text: 'TSUNAMI 1  ·  LEFT → RIGHT', color: '#d9ffff' })
        signs.push({ kind: 'instruction', x: 0, y: 5.2, z: zAt(a + 104), text: 'WAVE CHAIN  ·  KEEP MOVING TO THE SAFE ROOM', color: '#d9ffff' })
        break
      }
      case 'twisters':
        floor(a, b)
        for (let q = a + 18, i = 0; q < b - 10; q += 28, i++) {
          hazards.push({ type: 'tornado', x: 0, z: zAt(q + 24), zFrom: zAt(q - 8), zTo: zAt(q + 24), amp: 8, r: 3.2, h: 18, speed: 0.65, period: 15, offset: i * 3.2 })
          for (const side of [-1, 1]) deck(side * 16, q - 5, q + 5, 6, 0.08, theme.accent)
        }
        break
      case 'observatory': {
        river(a, b, 'water')
        deck(0, a, a + 12, 20)
        // An original flooded observatory route: alternating round-looking
        // sky docks, with timed rotating arms instead of falling crystals.
        const docks = [[-8, 25], [7, 48], [-7, 71], [8, 94], [-5, 117], [5, 140], [0, 160]]
        for (let i = 0; i < docks.length; i++) {
          const [x, q] = docks[i]
          const width = i === docks.length - 1 ? 18 : 12
          deck(x, a + q, a + q + 13, width, i % 2 ? 1.2 : 0.5, i % 2 ? '#d9faff' : theme.accent)
          deco(x, 2.1, zAt(a + q + 6.5), 1.1, 4.2 + (i % 3), 1.1, '#e1ffff', { neon: true })
          if (i > 0 && i < docks.length - 1) hazards.push({ type: 'sweeper', x, y: 1.15, z: zAt(a + q + 6.5), len: width * 0.38, period: 4.8, offset: i * 0.72, color: '#d4ff36' })
          if (i < docks.length - 1) {
            const [nx, nq] = docks[i + 1]
            const gapFrom = a + q + 13
            const gapTo = a + nq
            // Narrow glowing stepping bridge spans the water between docks.
            deck((x + nx) / 2, gapFrom, gapTo, 7, 0.25 + (i % 2) * 0.45, '#a5f4f6')
          }
        }
        deck(0, b - 10, b, 20)
        instruction('SUNKEN OBSERVATORY\nFollow the star docks and dodge the turning arms', a + 4)
        break
      }
      case 'timber':
      case 'boulderRun': {
        if (mod === 'timber') {
          // Stage 7 is now a pure broken-bridge crossing: no pickaxe, walls or
          // excavation gate. Permanent islands are the only rest points.
          river(a, b, 'toxic')
          deck(0, a, a + 10, W)
          const islandCount = 8
          for (let i = 0; i < islandCount; i++) {
            const q = a + 16 + i * 19
            const x = i % 2 ? 7 : -7
            const width = i % 3 === 0 ? 10 : 12
            const top = i % 2 ? 1.15 : 0.65
            deck(x, q, q + 11, width, top, i % 2 ? theme.accent : theme.wall2)
            if (i < islandCount - 1) {
              const nextQ = a + 16 + (i + 1) * 19
              const nextX = (i + 1) % 2 ? 7 : -7
              hazards.push({
                type: 'tile', x: (x + nextX) / 2, y: 0.75,
                z: zAt((q + 11 + nextQ) / 2), w: 9, h: 0.6, d: 8,
                period: 8.5, solidFrac: 0.58, offset: i * 0.9, color: '#d6a15a',
              })
            }
          }
          deck(0, b - 10, b, W)
          instruction('BROKEN BRIDGE CROSSING\nThe bridge shakes and collapses · KEEP MOVING', a + 3)
        } else {
          deck(0, a, a + 10, W)
          deck(0, b - 10, b, W)
          deck(0, a + 10, b - 10, 28, 0, theme.wall2)
          const lanes = [-8, 0, 8]
          for (let i = 0; i < 6; i++) {
            const q = a + 22 + i * 24
            const lane = lanes[i % lanes.length]
            hazards.push({ type: 'boulder', x: lane, zFrom: zAt(q + 12), zTo: zAt(q - 12), r: 2.8, kr: 3.5, period: 4.8, offset: i * 0.65, color: theme.accent })
            for (const side of [-1, 1]) deco(side * 17, 2.5, zAt(q), 1.5, 5, 5, theme.wall, { neon: true })
            neon(lane, 0.06, zAt(q), 5.5, 0.1, 0.3, '#ffe36b')
          }
          instruction('ROLLING BOULDER RUN\nSwitch lanes and dodge the incoming balls', a + 4)
        }
        break
      }
      case 'glacier': {
        river(a, b, 'water')
        deck(0, a, a + 10, 18)
        // A bright ice-cathedral route: broad landing pads alternate through the
        // water, then converge into a crowned central bridge before the exit.
        const pads = [
          [-9, 12, 11, 0.8],
          [7, 31, 10, 1.4],
          [-4, 50, 12, 0.5],
          [9, 69, 10, 1.7],
          [-6, 88, 12, 0.8],
          [4, 107, 11, 1.3],
          [0, 126, 18, 2.1],
          [0, 146, 18, 1.2],
        ]
        for (let i = 0; i < pads.length; i++) {
          const [x, q, width, height] = pads[i]
          const depth = i >= 6 ? 15 : 12
          deck(x, q, q + depth, width, height, i % 2 ? '#dffbff' : theme.accent)
          hazards.push({ type: 'falling', x, z: zAt(q + depth / 2), size: width - 1, period: 4.2, offset: i * 0.8, color: '#a0e9ff' })
          for (const side of [-1, 1]) {
            const crystalX = x + side * (width / 2 + 1.8)
            deco(crystalX, 2.2, zAt(q + depth / 2), 0.8, 4.4 + (i % 3) * 1.4, 0.8, '#c9f8ff', { neon: true })
          }
        }
        // Floating crown ribs make the centre section read like a cathedral nave.
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const q = a + 126 + i * 7
            deco(side * (7.5 - i * 0.8), 5.5, zAt(q), 0.55, 11, 0.55, theme.wall2, { neon: true })
            deco(side * (5.5 - i * 0.5), 10.3, zAt(q), 0.55, 0.55, 4.5, theme.accent, { neon: true })
          }
        }
        deck(0, b - 10, b, 18)
        instruction('GLACIER CATHEDRAL\nFollow the ice path through the falling crystals', a + 3)
        break
      }
      case 'pulse':
        floor(a, b)
        for (let q = a + 16, i = 0; q < b - 8; q += 18, i++) {
          hazards.push({ type: 'laser', x: 0, z: zAt(q), half: half - 1, y: 0.9, period: 4.8, onFrac: 0.52, offset: i * 0.8, color: i % 2 ? '#63f9ff' : '#ff76cf' })
          neon(0, 0.04, zAt(q + 3), W - 4, 0.08, 0.3)
        }
        break
      case 'vanish': {
        river(a, b)
        deck(0, a, a + 8, W)
        for (let q = a + 8, i = 0; q < b - 8; q += 8, i++) {
          const depth = Math.min(8, b - 8 - q)
          if (i % 3 === 0) deck(0, q, q + depth, 16, 0, '#e5cc83')
          else hazards.push({ type: 'tile', x: 0, y: -0.3, z: zAt(q + depth / 2), w: 12, h: 0.6, d: depth, period: 9, solidFrac: 0.76, offset: Math.floor(i / 3) * 1.3, color: theme.wall2 })
        }
        deck(0, b - 8, b, W)
        break
      }
      case 'windmills': {
        river(a, b, 'pink')
        const pathDeckZ = (x, from, to, width = 10, color = theme.floor) => {
          deck(x, from, to, width, 0, color)
          for (const side of [-1, 1]) neon(x + side * (width / 2 - 0.25), 0.06, zAt((from + to) / 2), 0.16, 0.12, to - from, '#fff0a3')
        }
        const pathDeckX = (from, to, dist, depth = 10, color = theme.accent) => {
          solid((from + to) / 2, -0.5, zAt(dist), to - from, 1, depth, color)
          neon((from + to) / 2, 0.06, zAt(dist - depth / 2 + 0.2), to - from, 0.12, 0.16, '#fff0a3')
          neon((from + to) / 2, 0.06, zAt(dist + depth / 2 - 0.2), to - from, 0.12, 0.16, '#fff0a3')
        }
        // Straight approach, right turn, straight return, then left turn.
        pathDeckZ(0, a, a + 22, W, theme.floor)
        pathDeckZ(0, a + 22, a + 46.5, 11, theme.accent)
        pathDeckX(0, 12, a + 52, 11, theme.wall2)
        // Stop each straight at the edge of its crosswalk. Keeping the box
        // surfaces edge-to-edge removes the coplanar overlap that flickered.
        pathDeckZ(12, a + 57.5, a + 78.5, 11, theme.floor)
        pathDeckX(-10, 12, a + 84, 11, theme.accent)
        // Five offset bridge spans. Their first and last edges meet the
        // crosswalks cleanly so no differently-coloured floor sits on top.
        for (let i = 0; i < 5; i++) {
          const q = a + 91.5 + i * 10
          const x = i % 2 ? -4 : -10
          deck(x, q, q + 7, 10, 0.4 + (i % 2) * 0.35, i % 2 ? theme.accent : theme.wall2)
          neon(x, 0.52 + (i % 2) * 0.35, zAt(q + 3.5), 8.5, 0.12, 0.14, '#fff0a3')
        }
        pathDeckZ(-10, a + 138.5, b - 10, 11, theme.floor)
        pathDeckZ(-10, b - 10, b, W, theme.floor)
        instruction('PINK RIVER SWITCHBACK\nStraight → RIGHT → straight → LEFT → jump the fading bridge', a + 4)
        break
      }
      case 'rapids':
        flood(a, b, 'water', 17)
        deck(0, a, b, 18)
        for (let q = a + 8, i = 0; q < b - 8; q += 22, i++) {
          const x = i % 2 ? 12 : -12
          for (let step = 0; step < 3; step++) deck(x, q + step * 2, q + (step + 1) * 2, 8, (step + 1) * 1.2, theme.accent)
          deck(x, q + 6, Math.min(q + 13, b), 8, 3.6, theme.accent)
        }
        break
      case 'aurora':
      case 'crown': {
        river(a, b, 'water')
        deck(0, a, a + 8, W)
        const segment = (L - 16) / 4
        for (let i = 0; i < 4; i++) {
          const q = a + 8 + i * segment
          const height = mod === 'crown' ? 6 : 4
          hazards.push({ type: 'lift', x: 0, y: -0.4, z: zAt(q + 6), w: 12, d: 12, h: 0.8, rise: height, period: 9, offset: i * 1.8, color: theme.accent })
          deck(0, q + 12, q + segment - 12, mod === 'crown' ? 8 : 12, height, theme.wall2)
          deck(0, q + segment - 12, q + segment, 14, 0, theme.accent)
          for (const side of [-1, 1]) deco(side * 8, height / 2, zAt(q + 6), 0.6, height + 2, 0.6, theme.accent, { neon: true })
          if (mod === 'crown') {
            deck(0, q + 20, q + 26, 8, height + 2.4, theme.floor)
            carryZones.push({ x: 0, z: zAt(q + 23), w: 10, d: 12 })
          }
        }
        deck(0, b - 8, b, W)
        break
      }
      case 'geysers':
        river(a, b, 'lava')
        deck(0, a, a + 10, 16)
        for (let i = 0; i < 9; i++) {
          const q = a + 14 + i * 20
          const x = i % 2 ? 6 : -6
          deck(x, q, q + 13, 11, 0, i % 2 ? theme.wall2 : theme.accent)
          hazards.push({ type: 'lavaBall', x, z: zAt(q + 6.5), r: 1.8, half: 5, dir: i % 2 ? -1 : 1, height: 7, period: 5.8, offset: i * 0.9, color: '#ff5a20' })
        }
        // Replace the long center bridge with short stepping stones so the
        // final stretch is crossed by jumping between platforms.
        for (let i = 0; i < 4; i++) {
          const q = b - 26 + i * 5
          const x = -3 + i * 3
          deck(x, q, q + 3, 8, 0.45, theme.accent)
        }
        deck(0, b - 10, b, 16)
        break
      case 'hammers':
        river(a, b, 'water')
        deck(0, a, b, 16)
        for (let q = a + 20, i = 0; q < b - 10; q += 26, i++) {
          hazards.push({ type: 'pendulum', x: 0, z: zAt(q), amp: 16, speed: 1.3, offset: i * 1.7, w: 6, h: 6, d: 4, color: theme.accent })
          deck(0, q - 9, q - 4, 24, 0, theme.accent)
        }
        break
      case 'orbit':
        river(a, b, 'water')
        deck(0, a, a + 8, W)
        for (let q = a + 8, i = 0; q < b - 8; q += 24, i++) {
          const end = Math.min(q + 24, b - 8)
          const x = i % 2 ? 8 : -8
          deck(0, q, q + 5, 30, 0, theme.accent)
          deck(x, q + 5, end, 12, 0, theme.floor)
          hazards.push({ type: 'sweeper', x, z: zAt(q + 14), len: 7, y: 0.65, speed: i % 2 ? -1.4 : 1.4, offset: i, color: theme.accent })
        }
        deck(0, b - 8, b, W)
        break
      default:
        throw new Error(`Unknown adventure: ${mod}`)
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
    solid(0, -0.5, ic, W, 1, il, theme.floor)
    solid(-half - 1, WALL_H / 2, ic, 2, WALL_H, il, theme.wall)
    solid(half + 1, WALL_H / 2, ic, 2, WALL_H, il, theme.wall)
    // Golden arch over the course entrance.
    solid(-half + 1.5, WALL_H / 2, z0 - 1, 3, WALL_H, 2, theme.wall2)
    solid(half - 1.5, WALL_H / 2, z0 - 1, 3, WALL_H, 2, theme.wall2)
    solid(0, WALL_H - 2, z0 - 1, W, 4, 2, theme.wall2)
    pushIntroSigns(signs, 1, z0 + 0.2)
  }

  // --- Safe room after the course ----------------------------------------------
  //   entry: narrower doorway framed in blue, "Safe Zone" above it
  //   left : yellow RETURN pad (+wins, back to lobby)
  //   right: red BONUS pad (2x wins), unlocked by the existing wins requirement
  //   front: door (left half) to the next stage, with the next stage's title above it
  const s0 = zEnd
  const s1 = zEnd - SAFE_ROOM_LEN
  const sc = (s0 + s1) / 2
  ceil.to = s1
  solid(safeCenter, -0.5, sc, safeWidth, 1, SAFE_ROOM_LEN, theme.floor)
  // Full-height side walls keep the safe room enclosed; the stage gates are its only exits.
  solid(safeCenter - safeWidth / 2 + 2, WALL_H / 2, sc, 4, WALL_H, SAFE_ROOM_LEN, theme.wall)
  solid(safeCenter + safeWidth / 2 - 2, WALL_H / 2, sc, 4, WALL_H, SAFE_ROOM_LEN, theme.wall)
  // Short theme-colored markers make the safe-room walls easy to read without
  // carrying the course's dense checker panels through the reward area.
  for (const side of [-1, 1]) {
    const wallX = safeCenter + side * (safeWidth / 2 - 2)
    for (let z = s0 - 5; z > s1 + 3; z -= 8) {
      deco(wallX - side * 2.06, 3.2, z, 0.16, 1.25, 2.4, theme.accent, { neon: true })
    }
  }
  // Chunky corner piers on the safe-room side cover the wall join and read as
  // architectural supports growing out from the room instead of a color seam.
  for (const side of [-1, 1]) {
    const wallX = safeCenter + side * (safeWidth / 2 - 2)
    const pierX = wallX - side * 1.25
    const pierZ = s0 - 2.4
    solid(pierX, WALL_H / 2, pierZ, 5.2, WALL_H, 5.6, theme.wall2)
    deco(pierX - side * 1.4, WALL_H / 2, pierZ, 0.28, WALL_H - 1, 4.4, theme.accent, { neon: true })
    deco(pierX - side * 2.62, WALL_H / 2, pierZ, 0.28, WALL_H - 1, 4.4, theme.wall)
    deco(pierX, WALL_H - 0.7, pierZ, 5.4, 0.45, 5.8, theme.accent, { neon: true })
  }
  if (exitX !== 0) deco(safeCenter, 0.035, sc, Math.abs(exitX) + 4, 0.07, 2.4, theme.accent)

  // Wins pads either side of the exit door (press E on one), open floor between them. The right
  // one pays double but stays locked until you have two rebirths.
  const returnPad = { x: exitX - 15, z: s1 + 9, w: 10, d: 10, wins: def.wins, bonus: false, minWins: 0, color: '#fff000' }
  const bonusPad = { x: exitX + 15, z: s1 + 9, w: 10, d: 10, wins: def.wins * 2, bonus: true, minRebirths: BONUS_PAD_MIN_REBIRTHS, color: '#ff2839' }
  for (const side of [-1, 1]) {
    neon(exitX + side * 8, 0.05, s1 + 13, 0.25, 0.1, 23, '#8dffe4')
    deco(exitX + side * 15, 0.04, s1 + 9, 12, 0.08, 12, '#12283f')
    solid(exitX + side * 15, 0.6, s1 + 19, 8, 1.2, 2, theme.wall2)
    deco(exitX + side * 15, 1.6, s1 + 18.3, 8, 1.3, 0.45, theme.accent)
  }

  signs.push({ kind: 'safe', x: 0, y: 18, z: s0 + 0.35, color: '#8fff00' })
  const gateHalf = STAGE_DOOR_W / 2
  const last = k === STAGE_COUNT
  const wallLeft = safeCenter - safeWidth / 2
  const wallRight = safeCenter + safeWidth / 2
  const doorway = (x, z) => {
    const leftWidth = x - gateHalf - wallLeft
    const rightWidth = wallRight - x - gateHalf
    solid(wallLeft + leftWidth / 2, WALL_H / 2, z, leftWidth, WALL_H, 2, theme.wall)
    solid(wallRight - rightWidth / 2, WALL_H / 2, z, rightWidth, WALL_H, 2, theme.wall)
    solid(x, (STAGE_GATE_H + WALL_H) / 2, z, gateHalf * 2, WALL_H - STAGE_GATE_H, 2, theme.wall)
    // Make the Safe Room exit wall read as one deliberate two-tone gateway.
    // Broad inset panels sit on the room-facing wall surface, clear of the doorway.
    for (const side of [-1, 1]) {
      const panelX = x + side * (gateHalf + 7)
      deco(panelX, WALL_H / 2, z + 1.06, 9, WALL_H - 5, 0.12, theme.wall2)
      deco(panelX, WALL_H - 3.4, z + 1.14, 7.8, 0.28, 0.1, theme.wall)
      deco(panelX, 3.4, z + 1.14, 7.8, 0.28, 0.1, theme.wall)
    }
    for (const side of [-1, 1]) {
      solid(x + side * (gateHalf + 0.7), STAGE_GATE_H / 2, z, 1.4, STAGE_GATE_H, 2.5, theme.wall2)
      for (const face of [-1, 1]) neon(x + side * (gateHalf + 0.15), STAGE_GATE_H / 2, z + face * 1.3, 0.24, STAGE_GATE_H, 0.12)
    }
    solid(x, STAGE_GATE_H + 0.5, z, gateHalf * 2 + 2.8, 1, 2.5, theme.wall2)
    for (const face of [-1, 1]) neon(x, STAGE_GATE_H + 0.15, z + face * 1.3, gateHalf * 2, 0.24, 0.12)
  }
  doorway(0, s0 - 1)
  if (last) {
    solid(safeCenter, WALL_H / 2, s1 + 1, safeWidth, WALL_H, 2, theme.wall)
    deco(0, 9, s1 + 2.05, 26, 10, 0.1, theme.wall2)
    signs.push({ kind: 'finale', x: 0, y: 9, z: s1 + 0.2, text: 'YOU ESCAPED!', emoji: '🏆' })
  } else {
    doorway(exitX, s1 - 1)
    pushIntroSigns(signs, k + 1, s1 + 0.2, exitX)
  }

  // Shift the complete world chunk onto its side of the zig-zag route.
  for (const box of boxes) { box.x += routeX; box.tile = 0.65 }
  for (const hazard of hazards) {
    hazard.x = (hazard.x || 0) + routeX
    hazard.stage = k
    if (hazard.shelters) for (const shelter of hazard.shelters) shelter.x += routeX
  }
  for (const gate of gates) gate.x += routeX
  for (const sign of signs) sign.x += routeX
  for (const current of currents) current.x += routeX
  for (const river of rivers) river.x += routeX
  for (const zone of carryZones) zone.x += routeX
  for (const site of digSites) site.x += routeX
  if (toolRack) toolRack.x += routeX
  returnPad.x += routeX
  bonusPad.x += routeX
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
    carryZones,
    digSites,
    toolRack,
    ceil,
    routeX,
    roofCenterX: routeX + safeCenter,
    roofWidth: safeWidth,
    returnPad,
    bonusPad,
    barrier: last ? null : { x: nextX, z: s1 - 2.35, w: gateHalf * 2 - 0.35, h: STAGE_GATE_H, color: theme.accent },
    safe: { z0: s0, z1: s1, x0: routeX + wallLeft, x1: routeX + wallRight },
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
  if (h.triggerOnEntry && h.activeAt == null) return null
  const clock = h.triggerOnEntry ? t - h.activeAt + h.offset : t + h.offset
  const p = frac(clock / h.period) * h.period
  if (h.axis === 'x') {
    const elapsed = p - h.warn
    if (elapsed < 0 || elapsed > h.travel) return null
    return { x: h.x + h.xFrom + (h.xTo - h.xFrom) * elapsed / h.travel, z: h.z }
  }
  if (h.warn != null) {
    const elapsed = p - h.warn
    if (elapsed < 0 || elapsed > h.travel) return null
    return { x: h.x || 0, z: h.zFrom + (h.zTo - h.zFrom) * (elapsed / h.travel) }
  }
  if (p > h.travel) return null
  return { x: h.x || 0, z: h.zFrom + (h.zTo - h.zFrom) * (p / h.travel) }
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

export function tornadoPos(h, t) {
  if (h.zFrom == null || h.zTo == null) return { x: tornadoX(h, t), z: h.z }
  const p = frac((t + h.offset) / h.period)
  return { x: tornadoX(h, t), z: h.zFrom + (h.zTo - h.zFrom) * p }
}

/** Lava ball leaping across the corridor in an arc. Returns { x, y }, or null while it's under. */
export function lavaBallPos(h, t) {
  const p = frac((t + h.offset) / h.period)
  if (p > 0.8) return null
  const q = p / 0.8
  return { x: (h.x || 0) + h.dir * (-h.half + 2 * h.half * q), y: h.r + 4 * h.height * q * (1 - q) }
}

export function sweeperAngle(h, t) {
  return (t + h.offset) * h.speed
}

export function pusherX(h, t) {
  return h.x + Math.sin((t + h.offset) * h.speed) * h.amp
}

export function pendulumX(h, t) {
  return (h.x || 0) + Math.sin((t + h.offset) * h.speed) * h.amp
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

/** Flood surface height in world space, rising continuously from the river below. */
export function tideLevel(h, t) {
  const p = frac((t + h.offset) / h.period)
  const rise = h.highY - h.lowY
  if (p < 0.38) return { level: h.lowY, warn: false }
  if (p < 0.62) return { level: h.lowY, warn: true }
  if (p < 0.67) return { level: h.lowY + rise * (p - 0.62) / 0.05, warn: false }
  if (p < 0.92) return { level: h.highY, warn: false }
  return { level: h.highY - rise * (p - 0.92) / 0.08, warn: false }
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

/** Smooth lifts pause at each landing, then travel between them. */
export function liftY(h, t) {
  const p = frac((t + h.offset) / h.period)
  const q = p < 0.2 ? 0 : p < 0.45 ? (p - 0.2) / 0.25 : p < 0.7 ? 1 : p < 0.95 ? 1 - (p - 0.7) / 0.25 : 0
  return h.y + q * h.rise
}

export function carryState(state, held, now) {
  if (!held) return { held: false, until: 0, carrying: false, remaining: 0 }
  const until = state.held ? state.until : now + 5000
  return { held: true, until, carrying: now < until, remaining: Math.max(0, (until - now) / 1000) }
}
