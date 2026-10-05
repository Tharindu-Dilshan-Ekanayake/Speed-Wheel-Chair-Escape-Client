import { send } from '../net/net'
import { STAGES, STAGE_COUNT, THEMES, stageEndZ, stageStartZ } from '../shared/gameData'
import { useGame } from '../state/store'

export function DevPanel() {
  const dev = useGame((s) => s.dev)
  const open = useGame((s) => s.devOpen)
  const view = useGame((s) => s.viewStage)
  if (!dev) return null
  const jump = (stage) => send('dev', { action: 'tp', stage })
  return (
    <div className="hud" style={{ zIndex: 25 }}>
      <button className="dev-toggle" aria-expanded={open} onClick={() => useGame.setState({ devOpen: !open })}>STAGE LAB · F2</button>
      {open && (
        <section className="dev" aria-label="Stage developer tools">
          <div className="dev-heading"><div><small>DEVELOPER TOOLS</small><h4>Adventure atlas</h4></div>
            <button aria-label="Close stage lab" onClick={() => useGame.setState({ devOpen: false })}>×</button>
          </div>
          <p>{STAGE_COUNT} worlds · Select a card to play from its entrance. Mine stages include a pickaxe.</p>
          <div className="dev-nav">
            <button onClick={() => jump(Math.max(0, view - 1))} disabled={view === 0}>Previous</button>
            <button onClick={() => jump(view)}>Restart</button>
            <button onClick={() => jump(Math.min(STAGE_COUNT, view + 1))} disabled={view === STAGE_COUNT}>Next</button>
            <button onClick={() => jump(0)}>Lobby</button>
          </div>
          <div className="stage-atlas">
            {STAGES.slice(1).map((stage, i) => {
              const k = i + 1
              const theme = THEMES[k]
              return <button key={k} className={`atlas-card ${view === k ? 'selected' : ''}`} style={{ '--stage-color': theme.accent }} aria-pressed={view === k} onClick={() => jump(k)} title={stage.hint}>
                <span className="atlas-number">{String(k).padStart(2, '0')} {theme.mascot}</span>
                <strong>{theme.name}</strong><span>{stage.adventure}</span>
                <small>{stageStartZ(k) - stageEndZ(k)} m · Level {stage.rec}</small>
              </button>
            })}
          </div>
          <div className="dev-nav">
            <button onClick={() => send('dev', { action: 'wins', amount: 100 })}>+100 wins</button>
            <button onClick={() => send('dev', { action: 'wins', amount: 10000 })}>+10K wins</button>
            <button onClick={() => send('dev', { action: 'level' })}>Max level</button>
            <button onClick={() => send('dev', { action: 'rebirths' })}>+1 rebirth</button>
          </div>
          <small>WASD drive · SPACE jump · Hold SHIFT to carry</small>
          <div className="dev-nav"><button onClick={() => {
            if (window.confirm('Reset this profile to a fresh start?')) send('dev', { action: 'reset' })
          }}>Reset profile</button></div>
        </section>
      )}
    </div>
  )
}
export default DevPanel
