/**
 * Tiny synthesized sound kit (WebAudio) - no audio files to host or load.
 * Browsers only allow audio after a user gesture, so the context is created lazily
 * on the first click / key press.
 */

let ctx = null
let master = null
let musicGain = null
let musicTimer = null
let muted = false
try {
  muted = localStorage.getItem('swce-muted') === '1'
} catch {
  /* storage blocked */
}

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.55
  master.connect(ctx.destination)
  // Background music: soft and low, rounded off so it never fights the game sounds.
  musicGain = ctx.createGain()
  musicGain.gain.value = 0.045
  const musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 1400
  musicGain.connect(musicFilter)
  musicFilter.connect(master)
  startMusic()
  return ctx
}

export function unlockAudio() {
  const c = ensure()
  if (c && c.state === 'suspended') c.resume()
}

export function setMuted(m) {
  muted = m
  try {
    localStorage.setItem('swce-muted', m ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05)
}
export const isMuted = () => muted

function tone(freq, { dur = 0.12, type = 'sine', vol = 0.3, at = 0, slide = 0, out = master } = {}) {
  if (!ctx || !out) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise({ dur = 0.3, vol = 0.3, at = 0, filter = 1200 } = {}) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = filter
  const g = ctx.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(t)
}

const SOUNDS = {
  click: () => tone(660, { dur: 0.06, type: 'square', vol: 0.12 }),
  step: () => tone(1200 + Math.random() * 300, { dur: 0.05, type: 'triangle', vol: 0.05 }),
  coin: () => {
    tone(988, { dur: 0.08, type: 'square', vol: 0.12 })
    tone(1319, { dur: 0.16, type: 'square', vol: 0.12, at: 0.07 })
  },
  gate: () => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.14, type: 'triangle', vol: 0.22, at: i * 0.06 }))
  },
  levelUp: () => {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { dur: 0.22, type: 'square', vol: 0.13, at: i * 0.08 }))
    tone(1568, { dur: 0.6, type: 'triangle', vol: 0.2, at: 0.42 })
  },
  win: () => {
    ;[523, 659, 784, 988, 1175, 1568].forEach((f, i) => tone(f, { dur: 0.24, type: 'triangle', vol: 0.22, at: i * 0.075 }))
    tone(1047, { dur: 0.75, type: 'sine', vol: 0.16, at: 0.35, slide: 180 })
    tone(1568, { dur: 0.6, type: 'triangle', vol: 0.12, at: 0.42, slide: 240 })
    noise({ dur: 0.45, vol: 0.07, at: 0.38, filter: 6500 })
  },
  buy: () => {
    tone(880, { dur: 0.08, type: 'square', vol: 0.12 })
    tone(1760, { dur: 0.2, type: 'triangle', vol: 0.18, at: 0.08 })
  },
  chair: () => {
    noise({ dur: 0.25, vol: 0.12, filter: 2500 })
    tone(440, { dur: 0.3, type: 'sawtooth', vol: 0.08, slide: 440 })
  },
  error: () => tone(200, { dur: 0.2, type: 'square', vol: 0.12, slide: -80 }),
  // Soft rubber "tok" as the wheels turn - rounded sine, never a harsh square click.
  tick: () => {
    const f = 430 + Math.random() * 120
    tone(f, { dur: 0.05, type: 'sine', vol: 0.06, slide: -90 })
    noise({ dur: 0.03, vol: 0.02, filter: 1800 })
  },
  jump: () => tone(380, { dur: 0.16, type: 'triangle', vol: 0.15, slide: 300 }),
  land: () => noise({ dur: 0.08, vol: 0.08, filter: 600 }),
  death: () => {
    tone(440, { dur: 0.5, type: 'sawtooth', vol: 0.15, slide: -360 })
    noise({ dur: 0.35, vol: 0.18, filter: 900 })
  },
  teleport: () => {
    tone(300, { dur: 0.5, type: 'sine', vol: 0.2, slide: 1500 })
    tone(600, { dur: 0.5, type: 'triangle', vol: 0.08, slide: 2000, at: 0.05 })
  },
  hatchShake: () => noise({ dur: 0.1, vol: 0.15, filter: 1500 }),
  hatch: () => {
    noise({ dur: 0.3, vol: 0.2, filter: 4000 })
    ;[659, 880, 1109, 1319].forEach((f, i) => tone(f, { dur: 0.25, type: 'triangle', vol: 0.2, at: 0.1 + i * 0.07 }))
  },
  rebirth: () => {
    tone(130, { dur: 1.2, type: 'sawtooth', vol: 0.12, slide: 900 })
    ;[523, 784, 1047, 1568, 2093].forEach((f, i) => tone(f, { dur: 0.4, type: 'triangle', vol: 0.18, at: 0.6 + i * 0.1 }))
  },
  open: () => tone(520, { dur: 0.08, type: 'triangle', vol: 0.12, slide: 200 }),
  close: () => tone(620, { dur: 0.08, type: 'triangle', vol: 0.1, slide: -200 }),
  chaser: () => tone(160, { dur: 0.4, type: 'sawtooth', vol: 0.1, slide: 60 }),
}

/* Wheelchair rolling: a light bicycle-pedal / chain rhythm. This replaces the
 * old airy wind loop, so movement sounds mechanical and hand-powered. */
let roll = null
function ensureRoll() {
  if (roll || !ctx) return
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i += 1) {
    const phase = (i / ctx.sampleRate * 4.2) % 1
    const pedalClick = phase < 0.055 ? Math.sin(phase * Math.PI / 0.055 * 8) * Math.exp(-phase * 46) : 0
    const chainRattle = (Math.random() * 2 - 1) * 0.035
    data[i] = pedalClick * 0.42 + chainRattle
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900
  filter.Q.value = 0.5
  const gain = ctx.createGain()
  gain.gain.value = 0
  src.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  src.start()
  roll = { filter, gain }
}

/** @param {number} level 0 (still) .. 1 (full speed); 0 also when airborne. */
export function setRoll(level) {
  if (!ctx || !master) return
  ensureRoll()
  const t = ctx.currentTime
  const v = muted ? 0 : level
  roll.gain.gain.setTargetAtTime(v * 0.16, t, 0.08)
  roll.filter.frequency.setTargetAtTime(700 + level * 1200, t, 0.12)
}

/* Carrying the chair uses feet instead of wheels: a separate, soft footfall
 * loop makes the SHIFT/carry state immediately recognisable. */
let carryRun = null
function ensureCarryRun() {
  if (carryRun || !ctx) return
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i += 1) {
    const phase = (i / ctx.sampleRate * 2.6) % 1
    const thump = phase < 0.16 ? Math.sin(phase * Math.PI / 0.16 * 2.2) * Math.exp(-phase * 18) : 0
    const shoe = phase < 0.04 ? (Math.random() * 2 - 1) * Math.exp(-phase * 70) : 0
    data[i] = thump * 0.5 + shoe * 0.2
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 360
  const gain = ctx.createGain()
  gain.gain.value = 0
  src.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  src.start()
  carryRun = { filter, gain }
}

/** @param {number} level 0 (not carrying/still) .. 1 (full carry speed). */
export function setCarryRun(level) {
  if (!ctx || !master) return
  ensureCarryRun()
  const t = ctx.currentTime
  const v = muted ? 0 : level
  carryRun.gain.gain.setTargetAtTime(v * 0.2, t, 0.07)
  carryRun.filter.frequency.setTargetAtTime(260 + level * 180, t, 0.1)
}

let lastStep = 0
let lastTick = 0
export function play(name) {
  if (!ensure() || muted) return
  if (name === 'step') {
    const now = performance.now()
    if (now - lastStep < 90) return
    lastStep = now
  }
  if (name === 'tick') {
    // At top speed ticks would machine-gun; keep them a relaxed, even patter.
    const now = performance.now()
    if (now - lastTick < 120) return
    lastTick = now
  }
  SOUNDS[name]?.()
}

/* Light-hearted chiptune loop. */
const MELODY = [
  72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 74, 76, 74, 0, 67, 0,
  72, 0, 76, 0, 79, 81, 79, 76, 77, 0, 76, 74, 72, 0, 0, 0,
]
const BASS = [48, 48, 55, 55, 53, 53, 55, 55]

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12)
}

function startMusic() {
  if (musicTimer) return
  let step = 0
  const beat = 0.19
  musicTimer = setInterval(() => {
    if (!ctx || muted || ctx.state !== 'running') return
    const n = MELODY[step % MELODY.length]
    if (n) tone(midi(n), { dur: beat * 0.9, type: 'triangle', vol: 0.12, out: musicGain })
    if (step % 4 === 0) tone(midi(BASS[(step / 4) % BASS.length]), { dur: beat * 3.5, type: 'sine', vol: 0.2, out: musicGain })
    step += 1
  }, 190)
}
