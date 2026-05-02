import { useState } from 'react'
import { X } from 'lucide-react'

const GENDERS = [{ k: 'F', l: 'Female' }, { k: 'M', l: 'Male' }, { k: 'X', l: 'Other' }]
const LEVELS  = ['Beginner', 'Intermediate', 'Advanced']

export function Sheet({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full bg-surface rounded-t-2xl px-4 pt-2 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="w-8 h-1 bg-line rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  )
}

export default function AddPlayerSheet({ open, onClose, onAdd }) {
  const [name,   setName]   = useState('')
  const [gender, setGender] = useState('')
  const [level,  setLevel]  = useState('beginner')
  const [saving, setSaving] = useState(false)

  function reset() { setName(''); setGender(''); setLevel('beginner') }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onAdd({ name: name.trim(), level, sex: gender || null })
      reset()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose() }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[16px] font-bold text-text">Add Player</div>
        <button
          onClick={() => { reset(); onClose() }}
          className="w-8 h-8 rounded-full bg-alt flex items-center justify-center text-dim cursor-pointer border-0"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.6px] mb-1.5">Full Name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Carlos Mendez"
            autoFocus
            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] text-text bg-bg outline-none focus:border-accent"
          />
        </div>
        <div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.6px] mb-1.5">Gender</div>
          <div className="flex gap-1.5">
            {GENDERS.map(g => (
              <button
                key={g.k}
                onClick={() => setGender(gender === g.k ? '' : g.k)}
                className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors ${gender === g.k ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-text'}`}
              >
                {g.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-dim uppercase tracking-[0.6px] mb-1.5">Level</div>
          <div className="flex gap-1.5">
            {LEVELS.map(lv => (
              <button
                key={lv}
                onClick={() => setLevel(lv.toLowerCase())}
                className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors ${level === lv.toLowerCase() ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-text'}`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { reset(); onClose() }}
          className="flex-1 min-h-[44px] rounded-xl bg-alt border border-line text-accent text-[13px] font-bold cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 min-h-[44px] rounded-xl bg-accent text-white text-[13px] font-bold cursor-pointer border-0 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add Player'}
        </button>
      </div>
    </Sheet>
  )
}
