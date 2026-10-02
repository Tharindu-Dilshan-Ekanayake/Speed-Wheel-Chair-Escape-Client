import { create } from 'zustand'

/**
 * Game UI state. Anything that changes every frame (positions, timers) lives in
 * `runtime` below instead, so React only re-renders on real UI changes.
 */
export const useGame = create((set, get) => ({
  /** 'connecting' | 'online' | 'reconnecting' | 'error' */
  net: 'connecting',
  netError: null,
  sid: null,
  roomId: null,
  dev: false,
  profile: null,
  friends: 0,
  lb: { level: [], rebirths: [], wins: [] },
  /** sid -> public look of every other player (name, chair, pets, avatar...) */
  players: {},

  /** Open modal: 'rebirth' | 'trails' | 'teleport' | 'auras' | 'inventory' | 'store' | 'daily' | null */
  panel: null,
  devOpen: false,
  /** Nearest interactable: { title, sub, key } */
  prompt: null,
  toasts: [],
  levelUp: null,
  bigPopup: null,
  hatch: null,
  dead: false,
  muted: false,
  /** Stage region the local player is in (0 = lobby) - drives what gets rendered. */
  viewStage: 0,

  setPanel: (panel) => set({ panel: get().panel === panel ? null : panel }),
  closePanel: () => set({ panel: null }),

  toast: (text, kind = 'info') => {
    const id = Math.random()
    set({ toasts: [...get().toasts.slice(-3), { id, text, kind }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600)
  },

  showBig: (popup) => {
    const id = Math.random()
    set({ bigPopup: { ...popup, id } })
    setTimeout(() => {
      if (get().bigPopup?.id === id) set({ bigPopup: null })
    }, popup.ms || 1800)
  },

  showLevelUp: (lv) => {
    const id = Math.random()
    set({ levelUp: { ...lv, id } })
    setTimeout(() => {
      if (get().levelUp?.id === id) set({ levelUp: null })
    }, 3200)
  },
}))

/**
 * Per-frame mutable state shared between the network layer and the scene.
 * Never put this in React state.
 */
export const runtime = {
  /** sid -> { x, y, z, yaw, flags, tx, ty, tz, tyaw } */
  remote: new Map(),
  /** Server clock offset (serverNow - localNow), ms. */
  clockOffset: 0,
  /** A teleport the server asked for, consumed by the local player. */
  pendingTeleport: null,
  /** Local player transform, for the camera / interactions / pets. */
  me: { x: 0, y: 1.5, z: 16, yaw: Math.PI, moving: false, grounded: true, onTread: false, stage: 0 },
  /** Queue of { amount, src } speed popups to spawn above the local player. */
  gains: [],
  /** sid ('me' for local) -> level-up flash time */
  flashes: new Map(),
  /** Speed gates claimed this run: Set of `${stage}:${idx}` */
  claimedGates: new Set(),
  /** Mobile joystick input. */
  touch: { x: 0, y: 0, jump: false },
  /** Yaw (radians) the chair still has to turn from right-click mouse dragging; drained by Player. */
  steerYaw: 0,
}

/** Seconds on the shared server clock - hazards are driven from this. */
export const serverTime = () => (Date.now() + runtime.clockOffset) / 1000
