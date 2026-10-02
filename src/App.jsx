import { useEffect, useRef, useState } from 'react'

import { isMuted, play, setMuted, unlockAudio } from './audio/sfx'
import { useBloxityStore } from './bloxity/store'
import GameScene from './game/GameScene'
import { connect, reconnectWithNewIdentity } from './net/net'
import { runtime, useGame } from './state/store'
import AuthHUD from './ui/AuthHUD'
import DevPanel from './ui/DevPanel'
import { MENU, buyPack, buyX2 } from './ui/actions'
import HUD from './ui/HUD'
import Overlays, { Hatch } from './ui/Overlays'
import Panels from './ui/Panels'
import TouchControls from './ui/TouchControls'

/** Keyboard shortcuts - each HUD button shows its key in its top-left corner. */
function useHotkeys() {
  useEffect(() => {
    const onKey = (e) => {
      unlockAudio()
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const g = useGame.getState()
      const key = e.key.toUpperCase()
      if (e.key === 'Escape') {
        if (g.panel) play('close')
        g.closePanel()
        return
      }
      if (e.key === 'F2' || e.key === '`') {
        e.preventDefault()
        if (g.dev) useGame.setState({ devOpen: !g.devOpen })
        return
      }
      if (!g.profile) return
      const menu = MENU.find((m) => m.key === key)
      if (menu) {
        play(g.panel === menu.id ? 'close' : 'open')
        g.setPanel(menu.id)
        return
      }
      switch (key) {
        case 'B':
          play(g.panel === 'store' ? 'close' : 'open')
          g.setPanel('store')
          break
        case 'X':
          buyX2()
          break
        case 'C':
          e.preventDefault()
          runtime.editSpeed?.()
          break
        case '1':
        case '2':
        case '3':
          buyPack(Number(key) - 1)
          break
        case 'E':
          runtime.interact?.()
          break
        case 'M':
          setMuted(!isMuted())
          break
        default:
      }
    }
    const onPointer = () => unlockAudio()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [])
}

/** Connect once Bloxity knows who we are (or after a short timeout, as a guest). */
function useNetwork() {
  const status = useBloxityStore((s) => s.status)
  const userId = useBloxityStore((s) => s.user?._id || s.user?.id || null)
  const started = useRef(false)
  const lastUser = useRef(userId)

  useEffect(() => {
    if (started.current) return undefined
    const go = () => {
      if (started.current) return
      started.current = true
      connect()
    }
    if (status === 'ready' || status === 'error') go()
    const id = setTimeout(go, 6000)
    return () => clearTimeout(id)
  }, [status])

  // Logging in / out switches which profile we play with.
  useEffect(() => {
    if (!started.current || lastUser.current === userId) return
    lastUser.current = userId
    reconnectWithNewIdentity()
  }, [userId])
}

function useFonts() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const done = () => setReady(true)
    Promise.race([
      document.fonts?.load('64px "Lilita One"').then(() => document.fonts.ready) ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 3000)),
    ]).then(done, done)
  }, [])
  return ready
}

function App() {
  useHotkeys()
  useNetwork()
  const fontsReady = useFonts()

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {fontsReady && <GameScene />}
      <HUD />
      <AuthHUD />
      <Panels />
      <Overlays />
      <DevPanel />
      <TouchControls />
      <div className="hud" style={{ zIndex: 40 }}>
        <Hatch />
      </div>
    </div>
  )
}

export default App
