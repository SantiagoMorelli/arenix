/**
 * Tiny Web Audio chime for achievement unlocks. Synthesised at runtime so we
 * don't ship an audio asset.
 *
 * Honors `localStorage['arenix.profile.soundOn']` — defaults to true.
 * Silently no-ops if AudioContext isn't available (private browsing,
 * autoplay-blocked tabs, etc).
 */

let ctx

const SOUND_KEY = 'arenix.profile.soundOn'

export function isSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'true' : 'false')
  } catch { /* ignore */ }
}

export function playUnlockChime() {
  if (!isSoundOn()) return
  try {
    if (typeof window === 'undefined') return
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return
    if (!ctx) ctx = new Ctor()

    // Some browsers suspend the context until a user gesture; resume best-effort.
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const tone = (freq, start, dur = 0.18) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    }

    tone(880, 0)        // A5
    tone(1108.73, 0.12) // C#6 — major-third up, cheerful
  } catch { /* silently ignore */ }
}
