import { useState } from 'react'
import { AppBadge, AppButton } from '../ui-new'

export default function TeamModal({ session, team, onSave, onClose }) {
  const isEdit = !!team
  const [name, setName]         = useState(team?.name || '')
  const [selected, setSelected] = useState(new Set(team?.playerIds || []))
  const [saving, setSaving]     = useState(false)

  const toggle = (pid) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid); else next.add(pid)
      return next
    })

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave(name.trim(), [...selected]) }
    finally { setSaving(false) }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-black text-text uppercase tracking-widest">
              {isEdit ? 'Edit Team' : 'New Team'}
            </div>
            <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Team name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Team Sunset"
              autoFocus
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3">
            Players ({selected.size} selected)
          </div>
          {session.players.length === 0 ? (
            <div className="text-[13px] text-dim py-4 text-center">Add players to the session first</div>
          ) : (
            <div className="flex flex-col gap-2">
              {session.players.map(p => {
                const on = selected.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer
                      ${on ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-text'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                      ${on ? 'border-free bg-free' : 'border-line bg-transparent'}`}>
                      {on && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                    </div>
                    <span className="text-[14px] font-semibold flex-1">{p.name}</span>
                    {p.isGuest && <AppBadge text="Guest" variant="dim" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 shrink-0 border-t border-line">
          <AppButton variant="free" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Team'}
          </AppButton>
        </div>
      </div>
    </div>
  )
}
