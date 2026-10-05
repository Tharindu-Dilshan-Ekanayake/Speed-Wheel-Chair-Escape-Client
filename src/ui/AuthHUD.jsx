import { useState } from 'react'

import { isMuted, play, setMuted } from '../audio/sfx'
import { useBloxity } from '../bloxity/BloxityContext'

/**
 * Player name / avatar card, top-RIGHT (the top-left is reserved for the Bloxity
 * platform logos). Uses the `getUser() || getGuest()` pattern so there is always a
 * name to show.
 */
export function AuthHUD() {
  const { identity, isLoggedIn } = useBloxity()
  const [muted, setM] = useState(isMuted())

  const name = identity?.displayName || identity?.username || 'Guest'
  const pfp = identity?.pfp

  return (
    <div className="id-card">
      <button
        className="pill"
        title="Sound (M)"
        onClick={() => {
          setMuted(!muted)
          setM(!muted)
          play('click')
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="idc">
        {pfp ? <img src={pfp} alt="" /> : <div className="pfp">{name.charAt(0).toUpperCase()}</div>}
        <div>
          <div className="nm">{name}</div>
          <div className="sub">{isLoggedIn ? 'Bloxity account' : 'Guest'}</div>
        </div>
      </div>
    </div>
  )
}

export default AuthHUD
