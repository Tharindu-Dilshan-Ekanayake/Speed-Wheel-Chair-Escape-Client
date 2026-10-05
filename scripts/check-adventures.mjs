import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import RAPIER from '@dimforge/rapier3d-compat'
import { allStages, buildStage, stageSpawn, regionAtZ, STAGE_COUNT, wavePos, carryState, liftY, tideLevel, stageAccess, newExpedition, expeditionAction, blockedExcavation, excavationComplete, canPush } from '../src/shared/gameData.js'
import { boxFaces } from '../src/game/world/boxFaces.js'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { checkKill } = await server.ssrLoadModule('/src/game/hazards.js')
  const { createOfflineRoom } = await server.ssrLoadModule('/src/net/offline.js')
  const clientData = await readFile(new URL('../src/shared/gameData.js', import.meta.url), 'utf8')
  const serverData = await readFile(new URL('../../Speed-Wheel-Chair-Escape-Server/src/shared/gameData.js', import.meta.url), 'utf8')
  assert.equal(clientData, serverData, 'client/server world must match byte for byte')
  const stages = allStages().slice(1).map((s) => ({ ...s, killBoxes: s.boxes.filter((b) => b.kind === 'kill') }))
  assert.equal(stages.length, 20)
  for (const stage of stages) {
    const spawn = stageSpawn(stage.k)
    assert.equal(regionAtZ(spawn.z).stage, stage.k, `stage ${stage.k} spawn must not select the previous region`)
    assert.ok(stage.len >= 170, 'adventures should be larger than the old courses')
    assert.deepEqual(buildStage(stage.k), allStages()[stage.k], 'deterministic layout')
    for (const b of stage.boxes) {
      assert.ok([b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite), `finite geometry in stage ${stage.k}`)
      assert.ok(b.w > 0 && b.h > 0 && b.d > 0, `positive geometry in stage ${stage.k}`)
    }
    const supported = (x, z) => stage.boxes.some((b) => b.kind === 'solid' && Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2 && Math.abs(b.y + b.h / 2) < 0.01)
    assert.ok(supported(spawn.x, spawn.z), `spawn has a floor in stage ${stage.k}`)
    assert.ok(supported(stage.returnPad.x, stage.returnPad.z), `return pad is supported in stage ${stage.k}`)
    for (let t = 0; t < 60; t += 0.25) assert.equal(checkKill(stage, spawn.x, 1, spawn.z, t), null, `safe checkpoint ${stage.k}`)
    assert.equal(stage.gates.length, 0, 'speed reward gates are removed')
    assert.ok(supported(stage.routeX, stage.zEnd + 9), 'finish landing must be on solid ground')
    if (stage.k < STAGE_COUNT) {
      const next = stages[stage.k]
      assert.equal(stage.safe.z1, next.z0, 'safe room connects to next course')
      assert.equal(stage.barrier.x, next.routeX, 'exit lines up with next stage')
    }
  }
  console.log('PASS all 20 deterministic layouts, safe spawns, reward pads and stage connections')

  const solidAt = (stage, x, y, z) => stage.boxes.some((b) => b.kind === 'solid' && Math.abs(x - b.x) <= b.w / 2 + 0.001 && Math.abs(y - b.y) <= b.h / 2 + 0.001 && Math.abs(z - b.z) <= b.d / 2 + 0.001)
  for (const stage of stages) {
    const { x0, x1, z0, z1 } = stage.safe
    for (const y of [0.5, 8, 15.5, 19.5]) {
      for (let z = z1 + 0.5; z < z0; z += 1) {
        assert.ok(solidAt(stage, x0 + 2, y, z), `stage ${stage.k} left wall is sealed`)
        assert.ok(solidAt(stage, x1 - 2, y, z), `stage ${stage.k} right wall is sealed`)
      }
      for (let x = x0 + 0.5; x < x1; x += 1) {
        const entranceOpen = y < 16 && Math.abs(x - stage.routeX) < 7
        assert.equal(solidAt(stage, x, y, z0 - 1), !entranceOpen, `stage ${stage.k} front wall and tall doorway`)
        const exitOpen = stage.barrier && y < 16 && Math.abs(x - stage.barrier.x) < 7
        assert.equal(solidAt(stage, x, y, stage.barrier ? z1 - 1 : z1 + 1), !exitOpen, `stage ${stage.k} rear wall and tall doorway`)
      }
    }
    for (const pad of [stage.returnPad, stage.bonusPad]) {
      assert.ok(pad.x - pad.w / 2 > x0 + 4 && pad.x + pad.w / 2 < x1 - 4, 'reward pads remain inside the walls')
      assert.equal(solidAt(stage, pad.x, 1, pad.z), false, 'reward pad stays accessible')
    }
  }
  console.log('PASS all safe rooms enclosed on four sides, 16m doorways and accessible reward pads')

  const laserStage = stages[8]
  const laser = laserStage.hazards[0]
  const laserOnly = { killBoxes: [], hazards: [laser] }
  assert.equal(checkKill(laserOnly, laser.x - laser.half + 1, 1, laser.z, 0), 'laser')
  assert.equal(checkKill(laserOnly, laser.x + laser.half + 2, 1, laser.z, 0), null)
  assert.equal(checkKill(laserOnly, laser.x, 1, laser.z, 3), null)
  const sea = stages[0].killBoxes[0]
  assert.equal(checkKill(stages[0], sea.x, sea.y + 1, sea.z, 0), 'water')
  const tsunami = stages[4]
  const wave = tsunami.hazards[0]
  const shelter = wave.shelters[0]
  const t = wave.warn + (shelter.x - wave.x - wave.xFrom) / (wave.xTo - wave.xFrom) * wave.travel
  const waveOnly = { killBoxes: [], hazards: [wave] }
  assert.ok(Math.abs(wavePos(wave, t).x - shelter.x) < 0.001)
  assert.equal(checkKill(waveOnly, shelter.x, 1, shelter.z, t), null, 'shelter protects from sideways tsunami')
  assert.equal(checkKill(waveOnly, wave.x, 1, wave.z, wave.warn + wave.travel / 2), 'wave', 'wave kills outside shelter')
  assert.equal(wavePos(wave, wave.warn - 0.1), null, 'warning precedes wave')
  console.log('PASS shifted laser collision, water death and tsunami shelter safety')

  for (const k of [3, 13, 19]) {
    const stage = stages[k - 1]
    const river = stage.rivers[0]
    const tide = river.tide
    assert.ok(stage.hazards.includes(tide), 'river and damage use the same tide')
    assert.deepEqual([tide.x, tide.z, tide.w, tide.d], [river.x, river.z, river.w, river.d])
    assert.equal(tideLevel(tide, 0).level, river.y, 'low tide starts at the original river')
    assert.equal(tideLevel(tide, tide.period * 0.5).warn, true)
    assert.equal(tideLevel(tide, tide.period * 0.8).level, 2.8)
    for (const phase of [0.38, 0.62, 0.67, 0.92, 1]) {
      const before = tideLevel(tide, tide.period * (phase - 0.000001)).level
      const after = tideLevel(tide, tide.period * (phase + 0.000001)).level
      assert.ok(Math.abs(after - before) < 0.001, 'surface never pops in or out')
    }
    for (let phase = 0; phase < 1; phase += 0.01) {
      const t = phase * tide.period
      const level = tideLevel(tide, t).level
      assert.ok(level >= river.y && level <= 2.8)
      assert.equal(checkKill(stage, tide.x, level + 0.9, tide.z, t), tide.cause, 'touching the visible liquid is lethal')
      assert.equal(checkKill(stage, tide.x, level + 1.1, tide.z, t), null, 'above the liquid is safe')
      assert.equal(checkKill(stage, tide.x + 12, 4.6, tide.z, t), null, '3.6m refuges stay above the flood')
    }
    assert.equal(checkKill(stage, tide.x, 1, tide.z, 0), null, 'walkway is safe at low tide')
    assert.equal(checkKill(stage, tide.x, 1, tide.z + tide.d / 2 - 1, tide.period * 0.8), tide.cause, 'damage covers the full rising river')
    assert.equal(checkKill(stage, stage.routeX, 1, stage.zEnd + 9, tide.period * 0.8), null, 'finish gate stays dry')
  }
  console.log('PASS continuous river floods, matching damage heights and safe refuges in stages 3, 13 and 19')

  let carry = carryState({}, true, 1000)
  assert.equal(carry.remaining, 5)
  carry = carryState(carry, true, 5999)
  assert.equal(carry.carrying, true)
  carry = carryState(carry, true, 6000)
  assert.equal(carry.carrying, false)
  assert.equal(carryState(carry, true, 9000).carrying, false, 'holding cannot retrigger carry')
  carry = carryState(carry, false, 9000)
  assert.equal(carryState(carry, true, 9100).remaining, 5)
  assert.equal(stageAccess({ level: 1, chair: 'classic' }, 1), null)
  assert.ok(stageAccess({ level: 1, chair: 'classic' }, 7))
  assert.ok(stageAccess({ totalLevel: 100, chair: 'classic' }, 20))
  assert.equal(stageAccess({ totalLevel: 100, chair: 'king' }, 20), null)
  for (const k of [7, 11]) {
    const expedition = newExpedition()
    const rack = allStages()[k - 1].toolRack
    assert.equal(expeditionAction(expedition, { x: rack.x, y: 1, z: rack.z }, 'pickup', k - 1), null)
    assert.equal(expedition.tool, 'pickaxe')
    let now = 1000
    for (const site of allStages()[k].digSites) {
      const pos = { x: site.x, y: site.y - 2, z: site.z + 2 }
      assert.equal(blockedExcavation(expedition, { ...pos, z: site.z - 2 }), true)
      for (let hit = 0; hit < site.hits; hit++) {
        assert.equal(expeditionAction(expedition, pos, 'dig', site.id, now), null)
        now += 500
      }
      assert.equal(blockedExcavation(expedition, { ...pos, z: site.z - 2 }), false)
    }
    assert.equal(excavationComplete(expedition, k), true)
  }
  const stage1 = stages[0]
  const a = { pos: { x: stage1.routeX, y: 1, z: stage1.z0 - 30 } }
  const b = { pos: { ...a.pos, x: a.pos.x + 2 } }
  assert.equal(canPush(a, b, 1000), true)
  assert.equal(canPush({ ...a, pushReadyAt: 2000 }, b, 1000), false)
  assert.equal(canPush(a, { ...b, pos: { ...b.pos, x: b.pos.x + 5 } }, 1000), false)
  assert.equal(canPush(a, { ...b, pos: { ...b.pos, z: stage1.safe.z0 - 10 } }, 1000), false)
  const lift = stages[14].hazards[0]
  assert.equal(liftY(lift, -lift.offset), lift.y)
  assert.equal(liftY(lift, lift.period * 0.5 - lift.offset), lift.y + lift.rise)
  const boxes = [{ x: 0, y: 0, z: 0, w: 4, h: 1, d: 4 }, { x: 2, y: 0, z: 0, w: 4, h: 1, d: 4 }]
  const topArea = boxFaces(boxes).flat().filter((f) => f.axis === 1 && f.sign === 1).reduce((sum, f) => sum + (f.rect[1] - f.rect[0]) * (f.rect[3] - f.rect[2]), 0)
  assert.equal(topArea, 24, 'overlapping top faces render exactly once')
  assert.equal(boxFaces([boxes[0], boxes[0]]).flat().length, 6, 'duplicate boxes have one visible shell')
  console.log('PASS five-second carry, progression, excavations, push limits, lift landings and coplanar face clipping')

  // Exercise the real Rapier capsule against the tall carry steps.
  await RAPIER.init()
  // A moving lift must physically carry the same capsule used by Player.
  {
    const physics = new RAPIER.World({ x: 0, y: -24, z: 0 })
    physics.timestep = 1 / 120
    const platform = physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, lift.y, 0))
    physics.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.4, 6), platform)
    const rider = physics.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.02, 0).lockRotations().setCcdEnabled(true))
    physics.createCollider(RAPIER.ColliderDesc.capsule(0.45, 0.55), rider)
    for (let i = 0; i < 600; i++) {
      platform.setNextKinematicTranslation({ x: 0, y: liftY(lift, i / 120), z: 0 })
      rider.setLinvel({ x: 0, y: rider.linvel().y, z: 0 }, true)
      physics.step()
    }
    assert.ok(Math.abs(rider.translation().y - (lift.rise + 1)) < 0.1, 'lift carries the wheelchair to the upper dock')
    physics.free()
  }
  function crossStep(jumpVelocity) {
    const physics = new RAPIER.World({ x: 0, y: -24, z: 0 })
    physics.timestep = 1 / 120
    physics.createCollider(RAPIER.ColliderDesc.cuboid(8, 0.5, 15).setTranslation(0, -0.5, 0))
    physics.createCollider(RAPIER.ColliderDesc.cuboid(6, 1.2, 6).setTranslation(0, 1.2, -7))
    const body = physics.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.01, 1.4).lockRotations().setCcdEnabled(true))
    physics.createCollider(RAPIER.ColliderDesc.capsule(0.45, 0.55).setFriction(0), body)
    for (let i = 0; i < 180; i++) {
      body.setLinvel({ x: 0, y: i === 0 ? jumpVelocity : body.linvel().y, z: -5.44 }, true)
      physics.step()
    }
    const result = { ...body.translation() }
    physics.free()
    return result
  }
  const seatedStep = crossStep(8.6)
  const carriedStep = crossStep(10.8)
  assert.ok(seatedStep.z > -1.6, 'seated jump cannot clear the tall portage step')
  assert.ok(carriedStep.z < -3, 'carry jump clears the tall portage step')
  console.log('PASS Rapier carry jump clears 2.4 m stairs; seated jump is blocked')

  const storage = new Map()
  globalThis.localStorage = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  const events = []
  const room = createOfflineRoom({ dispatch: (type, msg) => events.push({ type, msg }), name: 'AdventureTest' })
  try {
    assert.equal(events.find((e) => e.type === 'init').msg.dev, true)
    for (let k = 1; k <= STAGE_COUNT; k++) {
      room.send('dev', { action: 'tp', stage: k })
      const spawn = events.filter((e) => e.type === 'teleport').at(-1).msg
      assert.equal(regionAtZ(spawn.z).stage, k)
      room.send('pos', [spawn.x, 1, spawn.z, spawn.yaw, 11])
      room.send('respawn')
      assert.equal(events.filter((e) => e.type === 'teleport').at(-1).msg.z, spawn.z)
    }
    room.send('dev', { action: 'tp', stage: 4.9 })
    assert.equal(regionAtZ(events.filter((e) => e.type === 'teleport').at(-1).msg.z).stage, 4)
    room.send('dev', { action: 'tp', stage: 1 })
    const first = stages[0]
    room.send('pos', [first.routeX, 1, first.z0 - 4, Math.PI, 3])
    room.send('pos', [first.routeX, 1, first.zEnd + 9, Math.PI, 3])
    room.send('gate', { stage: 1, idx: 0 })
    assert.equal(events.some((e) => e.type === 'gain' && e.msg.src === 'gate'), false, 'old gate messages cannot grant speed')
    room.send('pos', [first.returnPad.x, 1, first.returnPad.z, Math.PI, 3])
    room.send('claimReturn', { stage: 1 })
    assert.ok(events.some((e) => e.type === 'reward' && e.msg.wins === 1))
    assert.equal(regionAtZ(events.filter((e) => e.type === 'teleport').at(-1).msg.z).stage, 0)
    console.log('PASS offline Stage Lab for all 20 stages, respawn, removed speed gates and return reward')
  } finally { room.stop() }
} finally { await server.close() }
