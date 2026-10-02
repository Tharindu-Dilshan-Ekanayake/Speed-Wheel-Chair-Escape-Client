import { send } from '../net/net'
import { STAGE_COUNT } from '../shared/gameData'
import { runtime, useGame } from '../state/store'

/**
 * Developer tool: jump between stages, give yourself wins, etc.
 * Toggle with F2 or the pink DEV button. Disabled entirely when the server reports
 * DEV_TOOLS = false (see src/shared/gameData.js).
 */
export function DevPanel() {
  const dev = useGame((s) => s.dev)
  const open = useGame((s) => s.devOpen)
  const view = useGame((s) => s.viewStage)
  if (!dev) return null
  return (
    <div className="hud" style={{ zIndex: 25 }}>
      <button className="dev-toggle" onClick={() => useGame.setState({ devOpen: !open })}>
        DEV (F2)
      </button>
      {open && (
        <div className="dev">
          <h4>🛠 Dev tool - remove before launch</h4>
          <div style={{ marginBottom: 6 }}>
            Region: {view === 0 ? 'Lobby' : `Stage ${view}`} • pos {runtime.me.x.toFixed(0)}, {runtime.me.z.toFixed(0)}
          </div>
          <div>Teleport to stage:</div>
          <div className="grid">
            <button onClick={() => send('dev', { action: 'tp', stage: 0 })}>Lobby</button>
            {Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).map((k) => (
              <button key={k} onClick={() => send('dev', { action: 'tp', stage: k })}>
                Stage {k}
              </button>
            ))}
          </div>
          <div className="grid">
            <button onClick={() => send('dev', { action: 'wins', amount: 100 })}>+100 wins</button>
            <button onClick={() => send('dev', { action: 'wins', amount: 10000 })}>+10K wins</button>
            <button onClick={() => send('dev', { action: 'level' })}>Max level</button>
            <button onClick={() => send('dev', { action: 'rebirths' })}>+1 rebirth</button>
          </div>
          <div className="grid">
            <button
              onClick={() => {
                if (window.confirm('Reset this profile to a fresh start?')) send('dev', { action: 'reset' })
              }}
            >
              Reset profile
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DevPanel
