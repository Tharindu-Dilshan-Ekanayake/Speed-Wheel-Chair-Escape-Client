import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

import { runtime } from '../state/store'

/** How high above the player's origin the camera aims. */
const LOOK_HEIGHT = 1.6

const MIN_DISTANCE = 3
const MAX_DISTANCE = 30
const START_DISTANCE = 11

// Pitch limits, in radians. Stops the camera flipping over the top or sinking
// under the track.
const MIN_PITCH = -0.15
const MAX_PITCH = 1.25
const START_PITCH = 0.38

const DRAG_SENSITIVITY = 0.005
const ZOOM_SENSITIVITY = 0.01

// Higher = snappier. Framerate-independent via the pow() smoothing below.
const POSITION_SMOOTHING = 12
const LOOK_SMOOTHING = 22

const _desired = new Vector3()
const _target = new Vector3()

/**
 * Third-person orbit camera.
 *
 * Trails the player's rigid body, easing both position and look-at target.
 * Left-drag orbits the camera only; right-drag also steers the chair. The mouse wheel zooms.
 *
 * Reads the Rapier body directly rather than React state - the body is the
 * authoritative transform and updates every physics step, not every render.
 *
 * @param {{ bodyRef: React.MutableRefObject<any> }} props
 */
export function FollowCamera({ bodyRef }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  // Spherical offset from the player. A ref, not state: pointer events write to it
  // every mousemove and the frame loop reads it - re-rendering would be wasteful.
  const orbit = useRef({ yaw: 0, pitch: START_PITCH, distance: START_DISTANCE, lastDrag: -10 })
  const lookAt = useRef(new Vector3())
  const initialised = useRef(false)

  useEffect(() => {
    const el = gl.domElement
    if (!el) return

    let dragging = false
    let steering = false // right button: the chair turns with the mouse, not just the camera
    let lastX = 0
    let lastY = 0

    const onPointerDown = (e) => {
      // Right button, or left button on the canvas itself (touch/trackpad friendly).
      if (e.button !== 2 && !(e.button === 0 && e.pointerType !== 'touch')) return
      dragging = true
      steering = e.button === 2
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      const o = orbit.current
      o.lastDrag = performance.now() / 1000
      o.yaw -= dx * DRAG_SENSITIVITY
      // Same amount on the chair keeps the camera sitting right behind it as it turns.
      if (steering) runtime.steerYaw -= dx * DRAG_SENSITIVITY
      o.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, o.pitch + dy * DRAG_SENSITIVITY))
    }

    const endDrag = (e) => {
      if (!dragging) return
      dragging = false
      steering = false
      el.releasePointerCapture?.(e.pointerId)
    }

    const onWheel = (e) => {
      // Without this the page scrolls behind the canvas.
      e.preventDefault()
      const o = orbit.current
      o.distance = Math.min(
        MAX_DISTANCE,
        Math.max(MIN_DISTANCE, o.distance + e.deltaY * ZOOM_SENSITIVITY),
      )
    }

    // Right-dragging otherwise opens the browser context menu mid-orbit.
    const onContextMenu = (e) => e.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('contextmenu', onContextMenu)
    // passive:false is required for preventDefault() on wheel to take effect.
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('contextmenu', onContextMenu)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((_state, delta) => {
    const body = bodyRef.current
    if (!body) return

    const pos = body.translation()
    _target.set(pos.x, pos.y, pos.z)

    // Follow-behind: the camera swings round behind the chair as you steer with
    // A / D, unless you've just orbited it by hand.
    const o = orbit.current
    const behind = runtime.me.yaw + Math.PI
    if (runtime.cameraSnap) {
      runtime.cameraSnap = false
      o.yaw = behind
      initialised.current = false
    } else if (performance.now() / 1000 - o.lastDrag > 1.2) {
      let d = behind - o.yaw
      d = Math.atan2(Math.sin(d), Math.cos(d))
      o.yaw += d * Math.min(1, delta * 4)
    }

    // Spherical -> cartesian. yaw 0 puts the camera behind the player on +Z.
    const { yaw, pitch, distance } = o
    const horizontal = Math.cos(pitch) * distance
    _desired.set(
      _target.x + Math.sin(yaw) * horizontal,
      _target.y + Math.sin(pitch) * distance + LOOK_HEIGHT,
      _target.z + Math.cos(yaw) * horizontal,
    )
    // Indoors the camera stays below the ceiling.
    if (runtime.me.stage > 0 && _desired.y > 17) _desired.y = 17

    if (!initialised.current) {
      // Avoid a long swoop in from wherever the default camera started.
      camera.position.copy(_desired)
      lookAt.current.copy(_target).setY(_target.y + LOOK_HEIGHT)
      initialised.current = true
    }

    // 1 - pow(x, delta) keeps the easing rate consistent across framerates.
    camera.position.lerp(_desired, 1 - Math.pow(0.001, delta * (POSITION_SMOOTHING / 10)))

    _target.y += LOOK_HEIGHT
    lookAt.current.lerp(_target, 1 - Math.pow(0.001, delta * (LOOK_SMOOTHING / 10)))
    camera.lookAt(lookAt.current)
  })

  return null
}

export default FollowCamera
