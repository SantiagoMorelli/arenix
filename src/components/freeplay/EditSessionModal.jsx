import { useState } from 'react'
import { AppButton } from '../ui-new'

export default function EditSessionModal({ session, leagues, onSave, onClose }) {
  const [name, setName]         = useState(session.name || '')
  const [leagueId, setLeagueId] = useState(session.league_id || '')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave({ name: name.trim(), leagueId: leagueId || null }) }
    finally { setSaving(false) }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl p-6 pb-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-black text-text uppercase tracking-widest">Edit Session</div>
          <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Session name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
          />
        </div>

        {leagues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">
              Link to league <span className="normal-case font-normal">(optional)</span>
            </label>
            <select
              value={leagueId}
              onChange={e => setLeagueId(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text focus:outline-none focus:border-free appearance-none"
            >
              <option value="">No league — standalone</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        <AppButton variant="free" onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </AppButton>
      </div>
    </div>
  )
}
