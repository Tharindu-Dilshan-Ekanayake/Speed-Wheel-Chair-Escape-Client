import { useEffect, useState } from 'react'
import { STAGES, STAGE_COUNT, THEMES, stageStartZ, stageEndZ } from '../shared/gameData'
import { runtime, useGame } from '../state/store'

export default function AdventureHUD() {
  const stage = useGame((s) => s.viewStage)
  const [progress, setProgress] = useState({ percent: 0, carry: false })
  useEffect(() => {
    if (!stage) return
    const timer = setInterval(() => {
      const start = stageStartZ(stage)
      setProgress({ percent: Math.max(0, Math.min(100, Math.round((start - runtime.me.z) / (start - stageEndZ(stage)) * 100))), remaining: runtime.me.carryRemaining || 0, carry: !!runtime.me.carrying })
    }, 150)
    return () => clearInterval(timer)
  }, [stage])
  if (!stage) return null
  return <div className="adventure-hud" style={{ '--stage-color': THEMES[stage].accent }}>
    <div className="adventure-heading"><span>{THEMES[stage].mascot} WORLD {String(stage).padStart(2, '0')} / {STAGE_COUNT}</span><span>{progress.percent}%</span></div>
    <strong>{THEMES[stage].name}</strong>
    <div className="adventure-progress"><div style={{ width: `${progress.percent}%` }} /></div>
    <p>{progress.carry ? `CARRYING · ${progress.remaining.toFixed(1)}s · Auto-seat at 0 · Release SHIFT to reset` : STAGES[stage].hint}</p>
  </div>
}
