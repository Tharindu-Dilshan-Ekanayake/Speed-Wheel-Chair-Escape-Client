import {
  CanvasTexture,
  Color,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

/**
 * Procedural textures + materials for the blocky "studs" look.
 * Everything is drawn on canvases at startup - no image assets to load.
 */

export const FONT = '"Lilita One", "Arial Black", Impact, sans-serif'
export const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'

/* ------------------------------------------------------------------ */
/* Stud texture + triplanar material                                    */
/* ------------------------------------------------------------------ */

/** World size of one stud tile, metres (was 1.1, then 0.55 - smaller tiles read as finer detail). */
const STUD = 0.3
/** Stud texture resolution in px. 2048 keeps the seams and rings crisp even up close at 4K. */
const STUD_RES = 2048

let studTexture = null
function getStudTexture() {
  if (studTexture) return studTexture
  // Drawn on a 2048px canvas (4K-class sharpness) but laid out in a 128-unit grid via scale(k).
  const s = STUD_RES
  const k = s / 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  g.fillStyle = '#e4e4e4'
  g.fillRect(0, 0, s, s)
  // Subtle grain: fine 4px specks written straight into the pixels (fast at this size).
  const img = g.getImageData(0, 0, s, s)
  const speck = 4
  for (let y = 0; y < s; y += speck) {
    for (let x = 0; x < s; x += speck) {
      const v = 214 + Math.floor(Math.random() * 30)
      for (let yy = y; yy < y + speck; yy += 1) {
        for (let xx = x; xx < x + speck; xx += 1) {
          const i = (yy * s + xx) * 4
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        }
      }
    }
  }
  g.putImageData(img, 0, 0)
  g.scale(k, k)
  // Tile seams.
  g.fillStyle = '#c4c4c4'
  g.fillRect(0, 0, 128, 3)
  g.fillRect(0, 0, 3, 128)
  g.fillStyle = '#f6f6f6'
  g.fillRect(0, 126, 128, 2)
  g.fillRect(126, 0, 2, 128)
  // The "stud": a rounded square ring with light top-left / dark bottom-right.
  const rr = (x, y, w, h, r) => {
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }
  g.lineWidth = 7
  g.strokeStyle = '#b3b3b3'
  rr(36, 36, 60, 60, 12)
  g.stroke()
  g.lineWidth = 4
  g.strokeStyle = '#fbfbfb'
  rr(32, 32, 60, 60, 12)
  g.stroke()

  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 16
  t.minFilter = LinearMipmapLinearFilter
  studTexture = t
  return t
}

const materialCache = new Map()

/**
 * A MeshStandardMaterial whose stud texture is projected in world space
 * (triplanar), so boxes of any size get evenly sized studs without custom UVs.
 */
export function studMaterial(
  color,
  { emissive = null, emissiveIntensity = 0.6, studs = true, texture = null, tile = STUD, checker = false } = {},
) {
  const key = `${color}|${emissive}|${emissiveIntensity}|${studs}|${texture?.uuid}|${tile}|${checker}`
  if (materialCache.has(key)) return materialCache.get(key)

  const mat = new MeshStandardMaterial({
    color: new Color(color),
    map: texture || (studs ? getStudTexture() : null),
    roughness: 0.82,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  if (emissive) {
    mat.emissive = new Color(emissive)
    mat.emissiveIntensity = emissiveIntensity
  }
  if (studs) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uStud = { value: 1 / tile }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvTriPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvTriNormal = normalize(mat3(modelMatrix) * normal);',
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;\nuniform float uStud;',
        )
        .replace(
          '#include <map_fragment>',
          `vec3 bw = abs(vTriNormal);
           bw = pow(bw, vec3(4.0));
           bw /= (bw.x + bw.y + bw.z);
           vec4 tx = texture2D(map, vTriPos.zy * uStud);
           vec4 ty = texture2D(map, vTriPos.xz * uStud);
           vec4 tz = texture2D(map, vTriPos.xy * uStud);
           diffuseColor *= tx * bw.x + ty * bw.y + tz * bw.z;
           ${checker ? `vec3 cells = floor(vTriPos / 3.0);
           float checks = mod(cells.y + cells.z, 2.0) * bw.x
             + mod(cells.x + cells.z, 2.0) * bw.y
             + mod(cells.x + cells.y, 2.0) * bw.z;
           diffuseColor.rgb *= mix(0.72, 1.0, checks);` : ''}`,
        )
    }
    mat.customProgramCacheKey = () => `studs-triplanar-${checker}`
  }
  materialCache.set(key, mat)
  return mat
}

const neonCache = new Map()
/** Unlit, tone-mapping-free colour: reads as a glowing tube / light strip. */
export function neonMaterial(color) {
  if (!neonCache.has(color)) {
    neonCache.set(color, new MeshBasicMaterial({
      color: new Color(color),
      toneMapped: false,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }))
  }
  return neonCache.get(color)
}

/* ------------------------------------------------------------------ */
/* Text + emoji textures                                                */
/* ------------------------------------------------------------------ */

const textCache = new Map()

/**
 * Chunky outlined text, like Roblox billboard GUIs.
 * `lines`: string or array of { text, color, size } (size relative to 1).
 * Returns { texture, aspect }.
 */
export function textTexture(lines, opts = {}) {
  const {
    color = '#ffffff',
    stroke = '#000000',
    strokeWidth = 0.16,
    size = 96,
    bg = null,
    padding = 0.35,
    gradient = null,
    align = 'center',
    font = FONT,
  } = opts
  const arr = (Array.isArray(lines) ? lines : String(lines).split('\n')).map((l) =>
    typeof l === 'string' ? { text: l } : l,
  )
  const key = JSON.stringify([arr, color, stroke, strokeWidth, size, bg, padding, gradient, align, font])
  if (textCache.has(key)) return textCache.get(key)

  const c = document.createElement('canvas')
  const g = c.getContext('2d')
  let w = 0
  let h = 0
  const metrics = arr.map((l) => {
    const fs = Math.round(size * (l.size || 1))
    g.font = `${fs}px ${l.font || font}`
    const tw = g.measureText(l.text).width
    w = Math.max(w, tw)
    h += fs * 1.12
    return { fs, tw }
  })
  const pad = size * padding
  c.width = Math.ceil(w + pad * 2)
  c.height = Math.ceil(h + pad * 2)

  if (bg) {
    g.fillStyle = bg
    const r = size * 0.3
    g.beginPath()
    g.roundRect?.(0, 0, c.width, c.height, r) ?? g.rect(0, 0, c.width, c.height)
    g.fill()
  }

  let y = pad
  arr.forEach((l, i) => {
    const { fs } = metrics[i]
    g.font = `${fs}px ${l.font || font}`
    g.textBaseline = 'top'
    g.textAlign = align
    const x = align === 'center' ? c.width / 2 : pad
    g.lineJoin = 'round'
    if (stroke && strokeWidth > 0) {
      g.lineWidth = fs * strokeWidth
      g.strokeStyle = l.stroke || stroke
      g.strokeText(l.text, x, y + fs * 0.06)
    }
    const col = l.color || color
    if (l.gradient || gradient) {
      const [a, b] = l.gradient || gradient
      const grad = g.createLinearGradient(0, y, 0, y + fs)
      grad.addColorStop(0, a)
      grad.addColorStop(1, b)
      g.fillStyle = grad
    } else {
      g.fillStyle = col
    }
    g.fillText(l.text, x, y + fs * 0.06)
    y += fs * 1.12
  })

  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  const out = { texture, aspect: c.width / c.height }
  textCache.set(key, out)
  return out
}

export function emojiTexture(emoji, size = 128) {
  return textTexture(emoji, { size, stroke: null, strokeWidth: 0, font: EMOJI_FONT, padding: 0.12 })
}

/** Star decal for the spawn pad. */
let starTex = null
export function starTexture() {
  if (starTex) return starTex
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  g.translate(s / 2, s / 2)
  g.fillStyle = '#2b3550'
  const spikes = 8
  g.beginPath()
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? s * 0.48 : s * 0.12
    const a = (i / (spikes * 2)) * Math.PI * 2
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(0, 0, s * 0.13, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#2b3550'
  g.lineWidth = 10
  g.beginPath()
  g.arc(0, 0, s * 0.18, 0, Math.PI * 2)
  g.stroke()
  starTex = new CanvasTexture(c)
  starTex.colorSpace = SRGBColorSpace
  return starTex
}

/** Soft round glow sprite for particles / auras. */
let glowTex = null
export function glowTexture() {
  if (glowTex) return glowTex
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.7)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  glowTex = new CanvasTexture(c)
  return glowTex
}

/** Vertical fade for light pillars: transparent at the top, brightest at the base. */
let beamTex = null
export function beamTexture() {
  if (beamTex) return beamTex
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,1)')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 128)
  beamTex = new CanvasTexture(c)
  return beamTex
}

/** Scrolling treadmill belt stripes. */
export function beltTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#2e3446'
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#454d66'
  for (let i = 0; i < 64; i += 16) g.fillRect(i, 0, 6, 64)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

/* ------------------------------------------------------------------ */
/* Cracked lava / toxic goo / water                                     */
/* ------------------------------------------------------------------ */

const hexRgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mixHex = (a, b, t) => {
  const A = hexRgb(a)
  const B = hexRgb(b)
  const v = A.map((x, i) => Math.round(x * (1 - t) + B[i] * t))
  return `#${v.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

const crackCanvases = new Map()
function crackCanvas(cell, crack) {
  const key = `${cell}|${crack}`
  if (crackCanvases.has(key)) return crackCanvases.get(key)
  const S = 128
  const N = 11
  let seed = 7
  const r = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const pts = Array.from({ length: N }, () => [r() * S, r() * S])
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  const img = g.createImageData(S, S)
  const cc = hexRgb(cell)
  const kk = hexRgb(crack)
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      let d1 = 1e9
      let d2 = 1e9
      for (const p of pts) {
        let dx = Math.abs(x - p[0])
        let dy = Math.abs(y - p[1])
        dx = Math.min(dx, S - dx)
        dy = Math.min(dy, S - dy)
        const d = Math.hypot(dx, dy)
        if (d < d1) {
          d2 = d1
          d1 = d
        } else if (d < d2) d2 = d
      }
      const t = Math.max(0, 1 - (d2 - d1) / 4.5)
      const shade = 0.82 + 0.18 * Math.min(1, d1 / 28)
      const i = (y * S + x) * 4
      for (let ch = 0; ch < 3; ch += 1) img.data[i + ch] = cc[ch] * shade * (1 - t) + kk[ch] * t
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  crackCanvases.set(key, c)
  return c
}

export function crackTexture(cell, crack, repeat = [1, 1]) {
  const t = new CanvasTexture(crackCanvas(cell, crack))
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

const lavaTextures = new Map()
/** Glowing cracked "lava" (or toxic goo when `cell` is dark) used for every kill surface. */
export function lavaMaterial(color, cell) {
  const crack = cell ? color : mixHex(color, '#ffffff', 0.5)
  const base = cell || mixHex(color, '#000000', 0.2)
  const key = `${base}|${crack}`
  if (!lavaTextures.has(key)) lavaTextures.set(key, crackTexture(base, crack))
  return studMaterial('#ffffff', {
    texture: lavaTextures.get(key),
    tile: 6,
    emissive: color,
    emissiveIntensity: cell ? 0.22 : 0.32,
  })
}

const sphereMats = new Map()
/** UV-mapped cracked ball (rolls with its mesh, unlike the world-projected floor). */
export function crackSphereMaterial(color, cell) {
  const key = `${color}|${cell}`
  if (!sphereMats.has(key)) {
    const crack = cell ? color : mixHex(color, '#ffffff', 0.5)
    const base = cell || mixHex(color, '#000000', 0.25)
    sphereMats.set(
      key,
      new MeshStandardMaterial({
        map: crackTexture(base, crack, [3, 2]),
        emissive: new Color(color),
        emissiveIntensity: 0.25,
        roughness: 0.7,
      }),
    )
  }
  return sphereMats.get(key)
}
