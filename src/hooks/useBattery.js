import { useState, useEffect } from 'react'

export function useBattery() {
  const [state, setState] = useState({ level: 1, charging: true, supported: false })

  useEffect(() => {
    if (!('getBattery' in navigator)) return
    let battery = null
    const update = () => setState({ level: battery.level, charging: battery.charging, supported: true })
    navigator.getBattery().then(b => {
      battery = b
      update()
      b.addEventListener('levelchange', update)
      b.addEventListener('chargingchange', update)
    })
    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', update)
        battery.removeEventListener('chargingchange', update)
      }
    }
  }, [])

  return state
}
