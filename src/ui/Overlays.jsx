import { useEffect, useState } from 'react'

import { play } from '../audio/sfx'
import { EGGS, PETS, RARITY } from '../shared/gameData'
import { runtime, useGame } from '../state/store'

function Prompt() {
  const prompt = useGame((s) => s.prompt)
  const panel = useGame((s) => s.panel)
  if (!prompt || panel) return null
  return (
    <div className={`prompt ${prompt.disabled ? 'disabled' : ''}`} onClick={() => runtime.interact?.()}>
      <div className="k">E</div>
      <div>
        <div className="t1">{prompt.title}</div>
        <div className="t2 otl">{prompt.sub}</div>
      </div>
    </div>
  )
}

function Toasts() {
  const toasts = useGame((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast otl ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

function LevelBanner() {
  const lv = useGame((s) => s.levelUp)
  if (!lv) return null
  return (
    <div className="lvl-banner" key={lv.id}>
      <div className="a otl">
        Level {lv.from} &gt; Level {lv.to}
      </div>
      <div className="b otl">
        Speed {lv.walkFrom} &gt; Speed {lv.walkTo}
      </div>
    </div>
  )
}

function BigPopup() {
  const pop = useGame((s) => s.bigPopup)
  if (!pop) return null
  if (pop.kind === 'speed') {
    return (
      <div className="big-popup" key={pop.id}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="main otl">{pop.text}</span>
          <span className="main otl" style={{ fontSize: 'calc(var(--u)*9)', marginTop: 'calc(var(--u)*-1)' }}>
            {pop.sub}
          </span>
        </div>
        <span className="emoji">👟</span>
      </div>
    )
  }
  return (
    <div className={`big-popup center ${pop.kind}`} key={pop.id}>
      <span className="emoji">{pop.kind === 'rebirth' ? '🔄' : '🏆'}</span>
      <span className="main otl" style={{ color: pop.kind === 'wins' ? '#ffe14d' : '#7fd8ff' }}>
        {pop.text}
      </span>
      <span className="sub otl">{pop.sub}</span>
    </div>
  )
}

function Death() {
  const dead = useGame((s) => s.dead)
  if (!dead) return null
  const msg = {
    water: 'Swept into the river!',
    tornado: 'Caught by the tornado!',
    fall: 'You fell! 😵',
    lava: 'Burned! 🔥',
    chaser: 'Caught! 😱',
    wave: 'Washed away! 🌊',
  }[dead] || 'Ouch! 💥'
  return <div className="death otl">{msg}</div>
}

function NetOverlay() {
  const net = useGame((s) => s.net)
  const err = useGame((s) => s.netError)
  const hasProfile = useGame((s) => !!s.profile)
  if (net === 'online') return null
  if (hasProfile) {
    return (
      <div className="net-overlay soft">
        <div className="title otl" style={{ fontSize: 'calc(var(--u)*5)' }}>
          {net === 'error' ? err || 'Connection lost' : 'Reconnecting…'}
        </div>
      </div>
    )
  }
  return (
    <div className="net-overlay loading-screen">
      <div className="loading-orbit"><span>♿</span></div>
      <div className="title otl">+1 SPEED WHEEL CHAIR ESCAPE</div>
      <div className="loading-sub otl">{net === 'error' ? 'Starting guest mode…' : 'Loading your racer…'}</div>
      <div className="loading-track"><div /></div>
      
    </div>
  )
}

export function Hatch() {
  const hatch = useGame((s) => s.hatch)
  if (!hatch) return null
  return <HatchAnim key={hatch.at} hatch={hatch} />
}

function HatchAnim({ hatch }) {
  const [phase, setPhase] = useState('shake')
  useEffect(() => {
    play('hatchShake')
    const t1 = setTimeout(() => {
      setPhase('reveal')
      play('hatch')
    }, 1300)
    const t2 = setTimeout(() => useGame.setState({ hatch: null }), 4600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])
  const pet = PETS[hatch.pet.type]
  const egg = EGGS.find((e) => e.id === hatch.egg)
  const rar = RARITY[pet.rarity]
  return (
    <div className="hatch" onClick={() => phase === 'reveal' && useGame.setState({ hatch: null })}>
      {phase === 'shake' ? (
        <div className="egg" style={{ filter: `drop-shadow(0 0 calc(var(--u)*3) ${egg?.color || '#fff'})` }}>
          🥚
        </div>
      ) : (
        <>
          <div className="rays" style={{ background: `repeating-conic-gradient(${rar.color}66 0 10deg, transparent 10deg 20deg)` }} />
          <div className="pet">{pet.emoji}</div>
          <div className="otl" style={{ fontSize: 'calc(var(--u)*6)', zIndex: 1 }}>
            {pet.name}
          </div>
          <div className="otl" style={{ fontSize: 'calc(var(--u)*4)', color: rar.color, zIndex: 1 }}>
            {rar.label} • x{pet.mult} Speed
          </div>
          <div className="otl" style={{ fontSize: 'calc(var(--u)*2.2)', marginTop: 'calc(var(--u)*2)', zIndex: 1 }}>
            (click to continue)
          </div>
        </>
      )}
    </div>
  )
}

export function Overlays() {
  return (
    <div className="hud" style={{ zIndex: 15 }}>
      <Prompt />
      <Toasts />
      <LevelBanner />
      <BigPopup />
      <Death />
      <NetOverlay />
    </div>
  )
}

export default Overlays
