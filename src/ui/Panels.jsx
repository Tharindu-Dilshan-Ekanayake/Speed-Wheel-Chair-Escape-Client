import { useEffect, useState } from 'react'

import { play } from '../audio/sfx'
import { send } from '../net/net'
import {
  AURAS,
  CHAIRS,
  DAILY_COOLDOWN_MS,
  DAILY_REWARDS,
  DAILY_STREAK_RESET_MS,
  EGGS,
  MAX_LEVEL,
  MAX_PETS,
  PETS,
  RARITY,
  REBIRTH_SPEED_BONUS,
  REBIRTH_WIN_BONUS,
  SPEED_PACKS,
  STAGES,
  STAGE_COUNT,
  TRAILS,
  TREADMILLS,
  X2_BOOST,
  formatNum,
  petMultiplier,
  petSlots,
} from '../shared/gameData'
import { useGame } from '../state/store'
import { buyPack, buyX2 } from './actions'

const STAGE_COLORS = [
  '#3a3f5c', '#e8323a', '#1f7fe0', '#1fae7a', '#6f70ad', '#1aa0f0', '#ff6fcf', '#5ab8e6',
  '#3f8f2a', '#d9a74a', '#22263a', '#3a2b52', '#7a1a1a', '#1a2350', '#5a6278', '#e0a800',
]
const STAGE_EMOJI = ['🏠', '👶', '👵', '☢️', '😒', '🌊', '🍭', '🥶', '🐍', '🐫', '🤖', '👻', '🌋', '👽', '⚡', '👑']

function Modal({ title, color, icon, children }) {
  const close = useGame((s) => s.closePanel)
  return (
    <div
      className="modal-back"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          play('close')
          close()
        }
      }}
    >
      <div className="modal">
        <div className="modal-head otl" style={{ background: color }}>
          <span>{icon}</span>
          <span>{title}</span>
          <button
            className="modal-close otl"
            onClick={() => {
              play('close')
              close()
            }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

const req = (reb) => `🔒 ${reb} Rebirth${reb > 1 ? 's' : ''}`

/* ------------------------------------------------------------------ */

function RebirthPanel({ p }) {
  const ready = p.level >= MAX_LEVEL
  const nextSpeed = Math.round((p.rebirths + 1) * REBIRTH_SPEED_BONUS * 100)
  const nextWins = Math.round((p.rebirths + 1) * REBIRTH_WIN_BONUS * 100)
  return (
    <Modal title="Rebirth" color="#2a9dff" icon="🔄">
      <div style={{ textAlign: 'center', fontSize: 'calc(var(--u)*2.6)' }}>
        <div style={{ fontSize: 'calc(var(--u)*4)' }}>
          Rebirths: <b>{p.rebirths}</b> → <b style={{ color: '#2a9dff' }}>{p.rebirths + 1}</b>
        </div>
        <div className="cards" style={{ margin: 'calc(var(--u)*2) 0' }}>
          <div className="card">
            <div className="big">👟</div>
            <div className="name">+{nextSpeed}% Speed gain</div>
          </div>
          <div className="card">
            <div className="big">🏆</div>
            <div className="name">+{nextWins}% Wins</div>
          </div>
          <div className="card">
            <div className="big">⚡</div>
            <div className="name">+1 Max walk speed</div>
          </div>
          <div className="card">
            <div className="big">🔓</div>
            <div className="name">Unlock chairs, eggs & treadmills</div>
          </div>
        </div>
        <div style={{ color: '#666', marginBottom: 'calc(var(--u)*1.6)' }}>
          Your level and speed reset to 1. Wins, pets, chairs, trails & auras are kept.
        </div>
        <button
          className="action-btn otl bg-blue"
          disabled={!ready}
          style={{ fontSize: 'calc(var(--u)*4)', padding: 'calc(var(--u)*1.2) calc(var(--u)*6)' }}
          onClick={() => {
            send('rebirth')
            useGame.getState().closePanel()
          }}
        >
          {ready ? 'REBIRTH!' : `Reach Level ${MAX_LEVEL} (now ${p.level})`}
        </button>
      </div>
    </Modal>
  )
}

function CosmeticPanel({ p, kind }) {
  const list = kind === 'trail' ? TRAILS : AURAS
  const owned = kind === 'trail' ? p.trails : p.auras
  const current = p[kind]
  return (
    <Modal title={kind === 'trail' ? 'Trails' : 'Auras'} color={kind === 'trail' ? '#ff3d55' : '#2fd35a'} icon={kind === 'trail' ? '✨' : '🔥'}>
      <div className="cards">
        {list.map((item) => {
          const has = owned.includes(item.id)
          const locked = !has && p.rebirths < item.reb
          const on = current === item.id
          const grad = item.colors.length ? `linear-gradient(90deg, ${item.colors.join(',')})` : '#ccc'
          return (
            <div
              key={item.id}
              className={`card ${on ? 'equipped' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => {
                if (on || locked) return
                play('click')
                send('cosmetic', { kind, id: item.id })
              }}
            >
              <div className="swatch" style={{ background: grad }} />
              <div className="name">{item.name}</div>
              <div className="tag otl" style={{ background: on ? '#2fd35a' : has ? '#2a9dff' : locked ? '#888' : '#ffad1f' }}>
                {on ? 'EQUIPPED' : has ? 'EQUIP' : locked ? req(item.reb) : item.price ? `🏆 ${formatNum(item.price)}` : 'FREE'}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function TeleportPanel({ p }) {
  const go = (stage) => {
    play('teleport')
    send('teleport', { stage })
    useGame.getState().closePanel()
  }
  return (
    <Modal title="Teleport" color="#b048ff" icon="🌀">
      <div className="stage-row otl" style={{ background: STAGE_COLORS[0] }} onClick={() => go(0)}>
        <span className="em">{STAGE_EMOJI[0]}</span>
        <span>Lobby</span>
        <span className="cost">FREE</span>
      </div>
      {Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).map((k) => {
        const locked = k > p.maxStage
        const cost = STAGES[k].tp
        return (
          <div
            key={k}
            className={`stage-row otl ${locked ? 'locked' : ''}`}
            style={{ background: STAGE_COLORS[k] }}
            onClick={() => !locked && go(k)}
          >
            <span className="em">{STAGE_EMOJI[k]}</span>
            <span>Stage {k}</span>
            <span style={{ fontSize: 'calc(var(--u)*2)', opacity: 0.9 }}>Lv {STAGES[k].rec} rec.</span>
            <span className="cost">{locked ? '🔒 Reach it first' : cost ? `🏆 ${formatNum(cost)}` : 'FREE'}</span>
          </div>
        )
      })}
    </Modal>
  )
}

function PetsTab({ p }) {
  const [sel, setSel] = useState(null)
  const slots = petSlots(p.rebirths)
  const sorted = [...p.pets].sort((a, b) => (PETS[b.type]?.mult || 0) - (PETS[a.type]?.mult || 0))
  const selected = p.pets.find((x) => x.uid === sel)
  const isEq = selected && p.equippedPets.includes(selected.uid)
  return (
    <>
      <div className="row" style={{ marginBottom: 'calc(var(--u)*1.6)', fontSize: 'calc(var(--u)*2.4)', flexWrap: 'wrap' }}>
        <span>
          Equipped {p.equippedPets.length}/{slots}
        </span>
        <span>•</span>
        <span>
          Pets {p.pets.length}/{MAX_PETS}
        </span>
        <span>•</span>
        <span style={{ color: '#1b9e2b' }}>Boost x{petMultiplier(p).toFixed(2)}</span>
        <span style={{ flex: 1 }} />
        <button className="action-btn otl bg-green" onClick={() => send('equipBest')}>
          Equip Best
        </button>
      </div>
      {!p.pets.length && (
        <div style={{ textAlign: 'center', fontSize: 'calc(var(--u)*2.6)', padding: 'calc(var(--u)*3)' }}>
          No pets yet! Hatch eggs in the lobby (or the Store) with your wins. 🥚
        </div>
      )}
      <div className="cards">
        {sorted.map((pet) => {
          const def = PETS[pet.type]
          if (!def) return null
          const eq = p.equippedPets.includes(pet.uid)
          return (
            <div
              key={pet.uid}
              className={`card ${eq ? 'equipped' : ''} ${sel === pet.uid ? 'sel' : ''}`}
              onClick={() => {
                play('click')
                setSel(pet.uid)
              }}
            >
              <div className="big">{def.emoji}</div>
              <div className="name">{def.name}</div>
              <div className="tag otl" style={{ background: RARITY[def.rarity].color }}>
                {RARITY[def.rarity].label}
              </div>
              <div className="meta">x{def.mult} Speed</div>
              {eq && <div className="meta" style={{ color: '#1b9e2b' }}>✔ Equipped</div>}
            </div>
          )
        })}
      </div>
      {selected && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 'calc(var(--u)*2)' }}>
          <button className="action-btn otl bg-blue" onClick={() => send('equipPet', { uid: selected.uid, on: !isEq })}>
            {isEq ? 'Unequip' : 'Equip'}
          </button>
          <button
            className="action-btn otl bg-red"
            onClick={() => {
              send('deletePet', { uid: selected.uid })
              setSel(null)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </>
  )
}

function ChairsTab({ p }) {
  return (
    <div className="cards">
      {CHAIRS.map((c) => {
        const has = p.chairs.includes(c.id)
        const on = p.chair === c.id
        const locked = !has && p.rebirths < c.reb
        return (
          <div
            key={c.id}
            className={`card ${on ? 'equipped' : ''} ${locked ? 'locked' : ''}`}
            onClick={() => {
              if (on || locked) return
              play('click')
              send('chair', { id: c.id })
            }}
          >
            <div className="big" style={{ filter: `drop-shadow(0 0 calc(var(--u)*0.8) ${c.aura === 'rainbow' ? '#ff3bd2' : c.aura || 'transparent'})` }}>♿</div>
            <div className="swatch" style={{ background: `linear-gradient(90deg, ${c.color}, ${c.wheel})`, height: 'calc(var(--u)*1.6)' }} />
            <div className="name">{c.name}</div>
            <div className="meta">
              +{c.perStep}/step • +{c.move} walk speed
            </div>
            <div className="tag otl" style={{ background: on ? '#2fd35a' : has ? '#2a9dff' : locked ? '#888' : '#ffad1f' }}>
              {on ? 'EQUIPPED' : has ? 'EQUIP' : locked ? req(c.reb) : c.price ? `🏆 ${formatNum(c.price)}` : 'FREE'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TreadmillsTab({ p }) {
  return (
    <div className="cards">
      {TREADMILLS.map((t) => {
        const has = p.treadmills.includes(t.id)
        const locked = !has && p.rebirths < t.reb
        return (
          <div
            key={t.id}
            className={`card ${has ? 'equipped' : ''} ${locked ? 'locked' : ''}`}
            onClick={() => {
              if (has || locked) return
              play('click')
              send('treadmill', { id: t.id })
            }}
          >
            <div className="big">🏃</div>
            <div className="name">{t.name}</div>
            <div className="meta">Sit on it in the lobby to gain speed automatically</div>
            <div className="tag otl" style={{ background: has ? '#2fd35a' : locked ? '#888' : '#ffad1f' }}>
              {has ? 'OWNED' : locked ? req(t.reb) : `🏆 ${formatNum(t.price)}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InventoryPanel({ p }) {
  const [tab, setTab] = useState('pets')
  return (
    <Modal title="Inventory" color="#ffad1f" icon="🎒">
      <div className="tabs">
        {[
          ['pets', '🐾 Pets'],
          ['chairs', '♿ Chairs'],
          ['treadmills', '🏃 Treadmills'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'pets' && <PetsTab p={p} />}
      {tab === 'chairs' && <ChairsTab p={p} />}
      {tab === 'treadmills' && <TreadmillsTab p={p} />}
    </Modal>
  )
}

function StorePanel({ p }) {
  return (
    <Modal title="Store" color="#2fd35a" icon="🛒">
      <div style={{ fontSize: 'calc(var(--u)*2.6)', marginBottom: 'calc(var(--u)*1)' }}>Boosts - everything costs 🏆 Wins!</div>
      <div className="cards" style={{ marginBottom: 'calc(var(--u)*2.4)' }}>
        <div className="card" onClick={buyX2}>
          <div className="big">⚡</div>
          <div className="name">x2 Speed</div>
          <div className="meta">{X2_BOOST.minutes} minutes (stacks)</div>
          <div className="tag otl" style={{ background: '#ffad1f' }}>
            🏆 {X2_BOOST.price}
          </div>
        </div>
        {SPEED_PACKS.map((pack, i) => (
          <div key={pack.id} className="card" onClick={() => buyPack(i)}>
            <div className="big">👟</div>
            <div className="name">{pack.label}</div>
            <div className="meta">Instant speed + XP</div>
            <div className="tag otl" style={{ background: '#ffad1f' }}>
              🏆 {formatNum(pack.price)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 'calc(var(--u)*2.6)', marginBottom: 'calc(var(--u)*1)' }}>Pet Eggs</div>
      <div className="cards">
        {EGGS.map((egg) => {
          const locked = p.rebirths < egg.reb
          return (
            <div
              key={egg.id}
              className={`card ${locked ? 'locked' : ''}`}
              onClick={() => {
                if (locked) return
                play('hatchShake')
                send('hatch', { id: egg.id })
              }}
            >
              <div className="big" style={{ filter: `drop-shadow(0 0 calc(var(--u)*0.6) ${egg.color})` }}>🥚</div>
              <div className="name">{egg.name}</div>
              <div className="meta">{egg.pets.map(([t]) => PETS[t].emoji).join(' ')}</div>
              <div className="tag otl" style={{ background: locked ? '#888' : '#ffad1f' }}>
                {locked ? req(egg.reb) : `🏆 ${formatNum(egg.price)}`}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function DailyPanel({ p }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const last = p.daily?.last || 0
  const left = last + DAILY_COOLDOWN_MS - now
  const ready = left <= 0
  const broken = now - last > DAILY_STREAK_RESET_MS
  const nextDay = broken ? 1 : (p.daily.streak % DAILY_REWARDS.length) + 1
  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const s = Math.floor((left % 60000) / 1000)
  return (
    <Modal title="Daily Gift" color="#ff58b5" icon="🎁">
      <div className="cards">
        {DAILY_REWARDS.map((w, i) => {
          const day = i + 1
          const done = !broken && day <= (p.daily.streak || 0) && !(ready && day === nextDay)
          const isNext = day === nextDay
          return (
            <div key={day} className={`card ${done ? 'equipped' : ''} ${isNext ? 'sel' : ''}`}>
              <div className="name">Day {day}</div>
              <div className="big">{day === 7 ? '💎' : '🏆'}</div>
              <div className="name">+{w} Wins</div>
              {done && <div className="meta">✔ Claimed</div>}
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 'calc(var(--u)*2.4)' }}>
        <button
          className="action-btn otl bg-pink"
          disabled={!ready}
          style={{ fontSize: 'calc(var(--u)*3.6)', padding: 'calc(var(--u)*1) calc(var(--u)*5)' }}
          onClick={() => send('daily')}
        >
          {ready ? `CLAIM DAY ${nextDay}!` : `Next gift in ${h}h ${m}m ${s}s`}
        </button>
        <div style={{ marginTop: 'calc(var(--u)*1)', color: '#666', fontSize: 'calc(var(--u)*2)' }}>
          Come back every day - miss 2 days and the streak resets.
        </div>
      </div>
    </Modal>
  )
}

export function Panels() {
  const panel = useGame((s) => s.panel)
  const p = useGame((s) => s.profile)
  if (!panel || !p) return null
  switch (panel) {
    case 'rebirth':
      return <RebirthPanel p={p} />
    case 'trails':
      return <CosmeticPanel p={p} kind="trail" />
    case 'auras':
      return <CosmeticPanel p={p} kind="aura" />
    case 'teleport':
      return <TeleportPanel p={p} />
    case 'inventory':
      return <InventoryPanel p={p} />
    case 'store':
      return <StorePanel p={p} />
    case 'daily':
      return <DailyPanel p={p} />
    default:
      return null
  }
}

export default Panels
