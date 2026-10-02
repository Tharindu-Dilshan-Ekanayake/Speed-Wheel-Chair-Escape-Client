import { useEffect, useRef, useState } from 'react'

import { play } from '../audio/sfx'
import { send } from '../net/net'
import {
  DAILY_COOLDOWN_MS,
  FRIEND_BOOST_PER_PLAYER,
  MAX_LEVEL,
  REBIRTH_SPEED_BONUS,
  SPEED_PACKS,
  X2_BOOST,
  formatNum,
  xpForLevel,
} from '../shared/gameData'
import { runtime, useGame } from '../state/store'
import { MENU, buyPack, buyX2 } from './actions'

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

function CustomSpeed({ profile }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const input = useRef()
  const max = profile.maxWalk
  const current = profile.customSpeed > 0 ? Math.min(profile.customSpeed, max) : max

  useEffect(() => {
    runtime.editSpeed = () => {
      setValue(String(current))
      setEditing(true)
    }
    return () => {
      runtime.editSpeed = null
    }
  }, [current])

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const n = Math.floor(Number(value))
    if (!Number.isFinite(n)) return
    send('customSpeed', { value: n >= max ? 0 : Math.max(1, n) })
  }

  return (
    <>
      <div className="cs-title otl">Custom Speed</div>
      <div
        className="cs-box"
        onClick={() => {
          setValue(String(current))
          setEditing(true)
        }}
      >
        <span className="key">C</span>
        <span className="pencil">✏️</span>
        {editing ? (
          <input
            ref={input}
            value={value}
            inputMode="numeric"
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span className="num otl">{current}</span>
        )}
      </div>
      <div className="cs-max otl">MAX: {max}</div>
    </>
  )
}

export function HUD() {
  const profile = useGame((s) => s.profile)
  const friends = useGame((s) => s.friends)
  const setPanel = useGame((s) => s.setPanel)
  const now = useNow(1000)
  if (!profile) return null

  const atMax = profile.level >= MAX_LEVEL
  const need = xpForLevel(profile.level)
  const pct = atMax ? 100 : Math.min(100, (profile.xp / need) * 100)
  const dailyReady = now - (profile.daily?.last || 0) >= DAILY_COOLDOWN_MS
  const boostLeft = Math.max(0, (profile.boostUntil || 0) - now)
  const mm = Math.floor(boostLeft / 60000)
  const ss = String(Math.floor((boostLeft % 60000) / 1000)).padStart(2, '0')

  const open = (id) => {
    play('open')
    setPanel(id)
  }

  return (
    <div className="hud">
      {/* LEFT: stats + menu (top-left corner left empty for platform logos) */}
      <div className="left-col">
        <div className="stat-row otl">
          <span className="icon">🔄</span>
          <span>{formatNum(profile.rebirths)}</span>
        </div>
        <div className="stat-row otl">
          <span className="icon">🏆</span>
          <span>{formatNum(profile.wins)}</span>
        </div>
        <div className="btn-grid">
          {MENU.map((m) => (
            <button key={m.id} className={`gbtn ${m.cls}`} onClick={() => open(m.id)}>
              <span className="key">{m.key}</span>
              {((m.id === 'rebirth' && atMax) || (m.id === 'daily' && dailyReady)) && <span className="badge">!</span>}
              <span className="ico">{m.icon}</span>
              <span className="lbl otl">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: custom speed, x2, store */}
      <div className="right-col">
        <CustomSpeed profile={profile} />
        <button className="wide-btn rainbow" onClick={buyX2} style={{ marginTop: 'calc(var(--u) * 1.4)' }}>
          <span className="key">X</span>
          <span className="otl">x2 Speed</span>
        </button>
        <div className="only otl">{boostLeft > 0 ? `ACTIVE ${mm}:${ss}` : `ONLY 🏆${X2_BOOST.price}`}</div>
        <button className="wide-btn bg-green" onClick={() => open('store')} style={{ marginTop: 'calc(var(--u) * 1.2)' }}>
          <span className="key">B</span>
          <span style={{ fontSize: 'calc(var(--u) * 4.6)' }}>🛒</span>
          <span className="otl">Store</span>
        </button>
      </div>

      {/* BOTTOM: speed, rebirth bonus, level bar, speed packs */}
      <div className="bottom">
        <div className="speed-line">
          <span className="otl">Speed: {formatNum(profile.speed)}</span>
          <span className="otl" style={{ color: '#2fa8ff' }}>
            Rebirth: +{Math.round(profile.rebirths * REBIRTH_SPEED_BONUS * 100)}%
          </span>
        </div>
        <div className={`levelbar ${atMax ? 'max' : ''}`}>
          <div className="fill" style={{ width: `${pct}%` }} />
          <div className="txt">
            <span className="otl">Level {profile.level}</span>
            <span className="otl">{atMax ? 'MAX - Rebirth! (R)' : `${formatNum(profile.xp)}/${formatNum(need)}`}</span>
          </div>
        </div>
        <div className="packs">
          {SPEED_PACKS.map((p, i) => (
            <button key={p.id} className={`pack pack-${p.color}`} onClick={() => buyPack(i)}>
              <span className="key">{p.key}</span>
              <span className="otl">{p.label}</span>
              <span className="price otl">🏆{formatNum(p.price)}</span>
            </button>
          ))}
          <button className="plus otl" onClick={() => open('store')}>
            +
          </button>
        </div>
      </div>

      <div className="friend">
        <span className="t otl">Friend Boost: {Math.round(Math.min(friends, 7) * FRIEND_BOOST_PER_PLAYER * 100)}%</span>
        <button
          className="plus otl"
          title="Invite friends: +10% speed for each player in your lobby"
          onClick={() => {
            play('click')
            useGame.getState().toast('Invite friends! +10% speed for every player in your lobby (max 70%)')
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default HUD
