import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'

import { play, setCarryRun, setRoll } from '../audio/sfx'
import { send } from '../net/net'
import {
  carryState, canPush,
  LOBBY,
  LOBBY_SPAWN,
  STAGES,
  WALK_TO_WORLD,
  formatNum,
  inPad,
  onTreadmill,
  regionAtZ,
  stageStartZ,
  walkSpeed,
  tornadoPos,
} from '../shared/gameData'
import { runtime, serverTime, useGame } from '../state/store'
import Chaser from './Chaser'
import Trail from './effects/Trail'
import { checkKill } from './hazards'
import { nearestSpot } from './interactions'
import PetFollowers from './Pets'
import Rider from './Rider'
import useKeyboard from './useKeyboard'
import { world } from './world/worldData'

// Capsule: total height 2*(HALF+RADIUS) = 2.0, centre 1.0 above the ground.
const CAPSULE_RADIUS = 0.55
const CAPSULE_HALF = 0.45
const CENTER_Y = CAPSULE_HALF + CAPSULE_RADIUS

const TURN_SPEED = 2.6 // rad/s for A / D
const UTURN_SPEED = 9 // rad/s for the S about-face (~0.35s for a half turn)
const UTURN_SLOW = 0.5 // share of top speed while still swinging round
const ACCEL = 30
const JUMP_VELOCITY = 8.6
const RESPAWN_DELAY = 0.9
const SEND_EVERY = 0.1

export function Player({ bodyRef, onAvatarReady }) {
  const keys = useKeyboard()
  const { rapier, world: physics } = useRapier()
  const profile = useGame((s) => s.profile)
  const visual = useRef()
  const wheelAnchor = useRef()
  const movingRef = useRef(false)
  const motionRef = useRef({ time: 0, push: 0, phase: 0, grounded: true, wheel: 0 })

  const st = useRef({
    yaw: LOBBY_SPAWN.yaw,
    speed: 0,
    carry: { held: false, until: 0 },
    knock: null,
    backHeld: false,
    uturn: 0, // radians of the S about-face still to turn
    jumpCd: 0,
    wasGrounded: true,
    dead: 0,
    respawnSent: 0,
    sendT: 0,
    tickAcc: 0,
    padCd: 0,
    promptId: null,
    viewStage: 0,
    courseStage: 0,
  })

  // E / interact handler, used by the global hotkeys.
  useEffect(() => {
    runtime.interact = () => {
      const id = st.current.promptId
      const prompt = useGame.getState().prompt
      if (!id || !prompt || prompt.disabled) return
      const me = runtime.me
      send('pos', [me.x, me.y, me.z, me.yaw, (me.grounded ? 2 : 0) | (me.carrying ? 8 : 0)])
      play('click')
      prompt.action?.()
    }
    return () => {
      runtime.interact = null
    }
  }, [])

  const isGrounded = (body) => {
    const p = body.translation()
    const ray = new rapier.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 })
    const max = CENTER_Y + 0.18
    const hit = physics.castRay(ray, max, true, undefined, undefined, undefined, body)
    return hit !== null && hit.timeOfImpact <= max
  }

  const die = (cause) => {
    const s = st.current
    if (s.dead) return
    s.dead = performance.now()
    s.respawnSent = 0
    play('death')
    useGame.setState({ dead: cause || true })
    if (runtime.chaser) runtime.chaser.active = false
  }

  useFrame((state, rawDt) => {
    const body = bodyRef.current
    if (!body || !profile) return
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const k = keys.current
    const touch = runtime.touch
    s.carry = carryState(s.carry, !!(k.sprint || touch.carry), performance.now())
    let carrying = s.carry.carrying

    // --- Server-driven teleports (spawn, respawn, stage teleport) ---------------
    if (runtime.pendingTeleport) {
      const t = runtime.pendingTeleport
      runtime.pendingTeleport = null
      s.knock = null
      s.carry = { held: !!(k.sprint || touch.carry), until: 0 }
      carrying = false
      body.setTranslation({ x: t.x, y: t.y, z: t.z }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      s.yaw = t.yaw ?? Math.PI
      s.speed = 0
      s.uturn = 0
      runtime.steerYaw = 0
      s.dead = 0
      runtime.cameraSnap = true
      runtime.chaser = null
      if (useGame.getState().dead) useGame.setState({ dead: false })
    }

    const pos = body.translation()
    const lv = body.linvel()

    // --- Dead: wait, then ask the server where to respawn ------------------------
    if (s.dead) {
      body.setLinvel({ x: 0, y: Math.min(lv.y, 0), z: 0 }, true)
      const age = (performance.now() - s.dead) / 1000
      if (age > RESPAWN_DELAY && (!s.respawnSent || performance.now() - s.respawnSent > 3000)) {
        s.respawnSent = performance.now()
        send('respawn')
      }
      visual.current.rotation.z = Math.min(1.4, age * 4)
      s.uturn = 0
      runtime.steerYaw = 0
      setRoll(0)
      setCarryRun(0)
      return
    }
    visual.current.rotation.z = 0

    const grounded = isGrounded(body)
    s.jumpCd = Math.max(0, s.jumpCd - dt)

    // --- Controls: A/D turn (camera follows), right-drag steers, W drives, S about-faces and drives ---
    const turn = (k.left ? 1 : 0) - (k.right ? 1 : 0) - touch.x
    s.yaw += turn * TURN_SPEED * dt + runtime.steerYaw
    runtime.steerYaw = 0
    const ahead = (k.forward ? 1 : 0) + Math.max(0, touch.y)
    const behind = (k.backward ? 1 : 0) + Math.max(0, -touch.y)
    // Pressing S spins the chair half a turn once, then it simply drives forward that way.
    const backNow = behind > 0.5 && ahead === 0
    if (backNow && !s.backHeld) s.uturn = Math.PI
    s.backHeld = backNow
    if (s.uturn > 0) {
      const step = Math.min(s.uturn, UTURN_SPEED * dt)
      s.yaw += step
      s.uturn -= step
    }
    const drive = ahead > 0 && behind > 0 ? 0 : Math.min(1, ahead + behind)
    const max = walkSpeed(profile) * WALK_TO_WORLD
    const target = max * drive * (carrying ? 0.85 : 1) * (s.uturn > 0.05 ? UTURN_SLOW : 1)
    const diff = target - s.speed
    s.speed += Math.sign(diff) * Math.min(Math.abs(diff), ACCEL * dt * (target === 0 ? 1.4 : 1))

    const fx = Math.sin(s.yaw)
    const fz = Math.cos(s.yaw)

    // Which stage am I in? (needed early: rapids push the chair.)
    const region = regionAtZ(pos.z)
    const W = world()
    const stage = region.stage ? W.stages[region.stage] : null
    if (region.stage !== s.courseStage || !region.inCourse) {
      if (region.stage === 5 && region.inCourse && s.courseStage !== 5) {
        const enteredAt = serverTime()
        for (const hazard of W.stages[5].hazards) if (hazard.triggerOnEntry) hazard.activeAt = enteredAt
      } else if (s.courseStage === 5) {
        for (const hazard of W.stages[5].hazards) if (hazard.triggerOnEntry) delete hazard.activeAt
      }
      s.courseStage = region.inCourse ? region.stage : 0
    }
    let flowX = 0
    let flowZ = 0
    if (stage) {
      for (const c of stage.currents) {
        if (Math.abs(pos.x - c.x) < c.w / 2 && Math.abs(pos.z - c.z) < c.d / 2) {
          flowX += c.vx
          flowZ += c.vz || 0
        }
      }
      // Storm stages tug the chair toward the moving funnel; keep the pull
      // modest enough that steering and forward drive can still beat it.
      for (const hazard of stage.hazards) {
        if (hazard.type !== 'tornado') continue
        const funnel = tornadoPos(hazard, serverTime())
        const dx = funnel.x - pos.x
        const dz = funnel.z - pos.z
        const distance = Math.hypot(dx, dz)
        const range = 14
        if (distance > 1 && distance < range) {
          const pull = 9 * (1 - distance / range)
          flowX += dx / distance * pull
          flowZ += dz / distance * pull
        }
      }
    }
    let vy = lv.y
    if ((k.jump || touch.jump) && grounded && s.jumpCd === 0) {
      vy = carrying ? 10.8 : JUMP_VELOCITY
      s.jumpCd = 0.3
      play('jump')
    }
    if (runtime.pendingPush) {
      s.knock = { ...runtime.pendingPush, until: performance.now() + runtime.pendingPush.duration * 1000 }
      runtime.pendingPush = null
      vy = Math.max(vy, s.knock.up)
    }
    if (s.knock) {
      const fade = Math.max(0, (s.knock.until - performance.now()) / (s.knock.duration * 1000))
      flowX += s.knock.x * fade
      flowZ += s.knock.z * fade
      if (!fade) s.knock = null
    }
    body.setLinvel({ x: fx * s.speed + flowX, y: vy, z: fz * s.speed + flowZ }, true)
    if (grounded && !s.wasGrounded && lv.y < -6) play('land')
    s.wasGrounded = grounded

    // --- Where am I? ---------------------------------------------------------------

    if (region.stage !== s.viewStage) {
      s.viewStage = region.stage
      useGame.setState({ viewStage: region.stage })
      if (region.stage === 0) runtime.claimedGates.clear()
    }

    // Treadmill: sitting on an owned one makes your arms push in place.
    let onTread = false
    if (region.stage === 0) {
      for (const t of LOBBY.treadmills) {
        if (onTreadmill(t, pos.x, pos.z) && profile.treadmills.includes(t.id)) {
          onTread = true
          break
        }
      }
    }

    // --- Avatar / wheel animation ---------------------------------------------------
    const motion = motionRef.current
    const absSpeed = Math.abs(s.speed)
    const effective = onTread && absSpeed < 0.5 ? max * 0.8 : absSpeed
    motion.time += dt
    motion.push = Math.min(1, effective / 5)
    motion.phase += dt * (2.5 + effective * 0.55)
    motion.grounded = grounded
    motion.carrying = carrying
    motion.speed = effective
    motion.maxSpeed = max
    motion.wheel += (onTread && absSpeed < 0.5 ? effective : s.speed) * dt / 0.55
    movingRef.current = absSpeed > 0.5 || onTread
    // Wheels use a bicycle-pedal rhythm; carrying uses separate footfalls.
    const moveLevel = Math.min(1, effective / max) * (effective > 0.3 ? 1 : 0)
    setRoll(grounded && !carrying ? moveLevel : 0)
    setCarryRun(grounded && carrying ? moveLevel : 0)
    if (grounded && !carrying && effective > 0.5) {
      s.tickAcc += effective * dt
      if (s.tickAcc > 1.5) {
        s.tickAcc = 0
        play('tick')
      }
    }
    visual.current.rotation.y = s.yaw

    const me = runtime.me
    me.x = pos.x
    me.y = pos.y
    me.z = pos.z
    me.yaw = s.yaw
    me.moving = absSpeed > 0.3
    me.grounded = grounded
    me.onTread = onTread
    me.stage = region.stage
    me.carrying = carrying
    me.carryRemaining = s.carry.remaining

    // --- Death checks ---------------------------------------------------------------
    if (pos.y < -14) return die('fall')
    const t = serverTime()
    const cause = checkKill(stage, pos.x, pos.y, pos.z, t)
    if (cause) return die(cause)

    // --- Chaser (Grandma / Ghost / King) ----------------------------------------------
    const def = region.stage ? STAGES[region.stage] : null
    if (def?.chaser && region.inCourse) {
      if (!runtime.chaser || runtime.chaser.stage !== region.stage) {
        runtime.chaser = {
          stage: region.stage,
          kind: def.chaser.kind,
          line: def.chaser.line,
          x: 0,
          z: stageStartZ(region.stage) + 1,
          yaw: Math.PI,
          startAt: performance.now() + 1200,
          active: true,
        }
        play('chaser')
      }
    }
    const ch = runtime.chaser
    if (ch?.active && performance.now() > ch.startAt) {
      if (region.inCourse && region.stage === ch.stage) {
        const dx = pos.x - ch.x
        const dz = pos.z - ch.z
        const d = Math.hypot(dx, dz)
        const step = Math.min(d, STAGES[ch.stage].chaser.speed * WALK_TO_WORLD * dt)
        ch.x += (dx / (d || 1)) * step
        ch.z += (dz / (d || 1)) * step
        ch.yaw = Math.atan2(dx, dz)
        if (d < 1.35) return die('chaser')
      } else if (region.inSafe) {
        ch.active = false
      }
    }

    // --- Wins pads in the safe room: stand on one and press E -------------------------
    s.padCd = Math.max(0, s.padCd - dt)
    let padSpot = null
    if (stage && region.inSafe) {
      for (const pad of [stage.returnPad, stage.bonusPad]) {
        if (!inPad(pad, pos.x, pos.z)) continue
        const k = stage.k
        const locked = pad.bonus && profile.rebirths < pad.minRebirths
        padSpot = {
          id: `pad-${k}-${pad.bonus ? 'b' : 'r'}-${locked ? 'l' : 'u'}`,
          prompt: locked
            ? { title: '🔒 Locked', sub: `Need ${pad.minRebirths} Rebirths to unlock`, disabled: true }
            : {
                title: `+${formatNum(pad.wins)} Wins${pad.bonus ? ' (2x!)' : ''}`,
                sub: 'Press E - claim & go to lobby',
                action: () => {
                  if (s.padCd > 0) return
                  s.padCd = 2
                  send('claimReturn', { stage: k, bonus: pad.bonus })
                },
              },
        }
      }
    }

    // --- Proximity prompt -------------------------------------------------------------
    const expedition = useGame.getState().expedition || { dug: {} }
    let adventureSpot = null
    if (stage?.toolRack && Math.hypot(pos.x - stage.toolRack.x, pos.z - stage.toolRack.z) < 4) {
      adventureSpot = { id: 'tool-' + stage.k, prompt: { title: 'Expedition pickaxe', sub: expedition.tool ? 'Pickaxe equipped' : 'Press E to pick up', disabled: !!expedition.tool, action: () => send('expedition', { action: 'pickup', id: stage.k }) } }
    }
    for (const site of stage?.digSites || []) {
      const hits = expedition.dug[site.id] || 0
      if (hits < site.hits && Math.abs(pos.x - site.x) < site.w / 2 && Math.abs(pos.z - site.z) < 4 && Math.abs(pos.y - (site.y - 2)) < 3) {
        adventureSpot = { id: site.id, prompt: { title: 'Excavate passage', sub: expedition.tool ? 'Press E to dig · ' + hits + '/' + site.hits : 'Pick up the pickaxe in the previous safe room', disabled: !expedition.tool, action: () => send('expedition', { action: 'dig', id: site.id }) } }
      }
    }
    if (!adventureSpot && region.inCourse) {
      let nearest = 3.1
      for (const [sid, remote] of runtime.remote) {
        const other = { x: remote.tx, y: remote.ty, z: remote.tz }
        const distance = Math.hypot(other.x - pos.x, other.z - pos.z)
        if (distance < nearest && canPush({ pos, expedition }, { pos: other, expedition })) {
          nearest = distance
          const seconds = Math.max(0, Math.ceil(((runtime.pushReadyAt || 0) - (Date.now() + runtime.clockOffset)) / 1000))
          adventureSpot = { id: 'push-' + sid, prompt: { title: 'Push ' + (useGame.getState().players[sid]?.name || 'player'), sub: seconds ? 'Ready in ' + seconds + 's' : 'Press E to push · 3s cooldown', disabled: seconds > 0, action: () => send('push', { sid }) } }
        }
      }
    }
    const near = padSpot || adventureSpot || (region.stage === 0 ? nearestSpot(pos.x, pos.z, profile) : null)
    const prev = useGame.getState().prompt
    if ((near?.id || null) !== s.promptId || (near && prev && near.prompt.sub !== prev.sub)) {
      s.promptId = near?.id || null
      useGame.setState({ prompt: near ? near.prompt : null })
    }

    // --- Network ------------------------------------------------------------------------
    s.sendT += dt
    if (s.sendT >= SEND_EVERY) {
      s.sendT = 0
      const flags = (me.moving ? 1 : 0) | (grounded ? 2 : 0) | (onTread ? 4 : 0) | (carrying ? 8 : 0)
      send('pos', [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), +s.yaw.toFixed(3), flags])
    }
  })

  const mySid = useGame((s) => s.sid)
  const petKey = (profile?.equippedPets || [])
    .map((uid) => profile.pets.find((p) => p.uid === uid)?.type)
    .filter(Boolean)
    .join(',')
  const petTypes = useMemo(() => (petKey ? petKey.split(',') : []), [petKey])

  return (
    <>
      <RigidBody
        ref={bodyRef}
        position={[LOBBY_SPAWN.x, LOBBY_SPAWN.y, LOBBY_SPAWN.z]}
        colliders={false}
        enabledRotations={[false, false, false]}
        friction={0}
        linearDamping={0}
        ccd
        name="player"
      >
        <CapsuleCollider args={[CAPSULE_HALF, CAPSULE_RADIUS]} friction={0} />
        <group ref={visual} position={[0, -CENTER_Y, 0]}>
          <Rider
            name={profile?.name}
            showName={false}
            level={profile?.level}
            chairId={profile?.chair || 'classic'}
            auraId={profile?.aura}
            motionRef={motionRef}
            fxKey="me"
            onReady={onAvatarReady}
          />
          <group ref={wheelAnchor} position={[0, 0, -0.5]} />
        </group>
      </RigidBody>
      <Trail key={profile?.trail} trailId={profile?.trail} targetRef={wheelAnchor} movingRef={movingRef} />
      <PetFollowers key={petKey + mySid} pets={petTypes} getAnchor={() => runtime.me} />
      <Chaser />
    </>
  )
}

export default Player
