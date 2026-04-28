import { useState, useEffect } from 'react'

// ── Avatar color ───────────────────────────────────────────────────────────────
function avatarBg(seed) {
  let h = 0; const s = String(seed)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff
  return `oklch(0.38 0.13 ${h % 360})`
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>{children}</svg>
)
const SearchIcon = () => <Svg size={16} className="text-dim shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>
const PlusIcon   = () => <Svg size={18}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>
const ChevR      = () => <Svg size={16} className="text-dim shrink-0"><polyline points="9 18 15 12 9 6"/></Svg>
const CheckIcon  = ({ size = 11 }) => <Svg size={size} className="shrink-0"><polyline points="20 6 9 17 4 12"/></Svg>
const EditIcon   = () => <Svg size={14} className="shrink-0"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>
const XIcon      = ({ size = 14 }) => <Svg size={size} className="shrink-0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>
const LinkIcon   = ({ size = 14 }) => <Svg size={size} className="shrink-0"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></Svg>

// ── Shared data ────────────────────────────────────────────────────────────────
const GENDERS      = [{ k: 'F', l: 'Female' }, { k: 'M', l: 'Male' }, { k: 'X', l: 'Other' }]
const LEVELS       = ['Beginner', 'Intermediate', 'Advanced']
const GENDER_LABEL = { F: 'Female', M: 'Male', X: 'Other' }
const levelCap     = v => (v ? v[0].toUpperCase() + v.slice(1) : '—')

// ── Sheet ──────────────────────────────────────────────────────────────────────
function Sheet({ open, onClose, children }) {
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

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-alt border border-line text-text text-[12px] font-semibold px-4 py-2.5 rounded-xl pointer-events-none whitespace-nowrap">
      {message}
    </div>
  )
}

// ── Avatar with link-status dot ────────────────────────────────────────────────
function Avatar({ player, size, dotBorder }) {
  const sz       = size || 34
  const isLarge  = sz > 40
  const isLinked = !!player.userId
  const label    = player.displayName || player.name || '?'
  const dotSz    = isLarge ? 16 : 11
  const dotBw    = isLarge ? 3 : 2
  const radius   = isLarge ? 14 : 10

  return (
    <div className="relative flex-shrink-0" style={{ width: sz, height: sz }}>
      <div
        className="flex items-center justify-center font-bold text-white"
        style={{ width: sz, height: sz, fontSize: isLarge ? 22 : 13, borderRadius: radius, backgroundColor: avatarBg(player.id || player.name) }}
      >
        {label[0].toUpperCase()}
      </div>
      <span
        className="absolute rounded-full"
        style={{
          right: -1, bottom: -1,
          width: dotSz, height: dotSz,
          backgroundColor: isLinked ? '#2ECC71' : 'transparent',
          border: `${dotBw}px solid ${dotBorder || '#1A2734'}`,
          boxShadow: isLinked ? '0 0 0 1px #2ECC71' : '0 0 0 1px #7A8EA0',
        }}
      />
    </div>
  )
}

// ── PlayerDetailSheet ──────────────────────────────────────────────────────────
function PlayerDetailSheet({ player, onClose, onSave, onLink, onUnlink, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(null)

  useEffect(() => {
    if (player) {
      setDraft({
        name:     player.displayName || player.name || '',
        nickname: player.nickname || '',
        gender:   player.sex || player.gender || '',
        level:    player.level || 'beginner',
      })
      setEditing(false)
    }
  }, [player?.id])

  if (!player || !draft) return null
  const isLinked = !!player.userId

  function handleSave() {
    onSave({ name: draft.name, nickname: draft.nickname, sex: draft.gender, level: draft.level })
    setEditing(false)
  }

  const detailRows = [
    { label: 'FULL NAME', value: player.displayName || player.name },
    { label: 'NICKNAME',  value: player.nickname || '—' },
    { label: 'GENDER',    value: GENDER_LABEL[player.sex || player.gender] || '—' },
    {
      label: 'LEVEL',
      value: (
        <span className="inline-block px-2.5 py-[3px] rounded-full bg-accent/15 text-accent text-[12px] font-bold">
          {levelCap(player.level)}
        </span>
      ),
    },
    {
      label: 'ELO',
      value: <span className="font-display text-[16px] text-text">{player.points ?? 0}</span>,
      last:  true,
    },
  ]

  return (
    <Sheet open={!!player} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar player={player} size={56} dotBorder="#0F1923" />
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-bold text-text leading-tight">{player.displayName || player.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            {isLinked ? (
              <>
                <span className="text-success"><CheckIcon size={11} /></span>
                <span className="text-[11px] text-success font-semibold">Linked</span>
                {player.email && <span className="text-[11px] text-dim">· {player.email}</span>}
              </>
            ) : (
              <span className="text-[11px] text-dim">Guest player · no account</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-alt flex items-center justify-center text-dim cursor-pointer border-0 flex-shrink-0"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* View mode */}
      {!editing ? (
        <div className="bg-bg border border-line rounded-xl overflow-hidden mb-3.5">
          {detailRows.map(({ label, value, last }) => (
            <div key={label} className={`flex items-center min-h-[44px] px-3.5 py-3 ${!last ? 'border-b border-line' : ''}`}>
              <span className="w-24 text-[11px] font-bold text-dim uppercase tracking-[0.6px] flex-shrink-0">{label}</span>
              <span className="flex-1 text-[13px] text-text text-right">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        /* Edit form */
        <div className="bg-bg border border-line rounded-xl p-3 mb-3.5 flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-bold text-dim uppercase tracking-[0.6px] mb-1.5">Full Name</div>
            <input
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] text-text bg-surface outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[10px] font-bold text-dim uppercase tracking-[0.6px] mb-1.5">Nickname</div>
            <input
              value={draft.nickname}
              onChange={e => setDraft({ ...draft, nickname: e.target.value })}
              placeholder="Optional"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] text-text bg-surface outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[10px] font-bold text-dim uppercase tracking-[0.6px] mb-1.5">Gender</div>
            <div className="flex gap-1.5">
              {GENDERS.map(g => (
                <button
                  key={g.k}
                  onClick={() => setDraft({ ...draft, gender: g.k })}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors ${draft.gender === g.k ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-text'}`}
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
                  onClick={() => setDraft({ ...draft, level: lv.toLowerCase() })}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors ${draft.level === lv.toLowerCase() ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-text'}`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!editing ? (
        <>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-accent text-white text-[13px] font-bold cursor-pointer border-0"
            >
              <EditIcon /> Edit details
            </button>
            {isLinked ? (
              <button
                onClick={onUnlink}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-alt border border-line text-text text-[13px] font-semibold cursor-pointer"
              >
                <XIcon size={14} /> Unlink
              </button>
            ) : (
              <button
                onClick={onLink}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-alt border border-line text-text text-[13px] font-semibold cursor-pointer"
              >
                <LinkIcon size={14} /> Link
              </button>
            )}
          </div>
          <button
            onClick={onRemove}
            className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-error/40 text-error text-[13px] font-bold cursor-pointer bg-transparent"
          >
            <XIcon size={14} /> Remove from league
          </button>
        </>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 min-h-[44px] rounded-xl bg-alt border border-line text-accent text-[13px] font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!draft.name.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-accent text-white text-[13px] font-bold cursor-pointer border-0 disabled:opacity-50"
          >
            <CheckIcon size={14} /> Save
          </button>
        </div>
      )}
    </Sheet>
  )
}

// ── ConfirmSheet ───────────────────────────────────────────────────────────────
function ConfirmSheet({ confirm, onCancel, onConfirm }) {
  if (!confirm) return null
  const isRemove = confirm.kind === 'remove'
  const name     = confirm.player.displayName || confirm.player.name

  return (
    <Sheet open={true} onClose={onCancel}>
      <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mx-auto mb-3">
        <XIcon size={22} />
      </div>
      <div className="text-[17px] font-bold text-text text-center mb-1.5">
        {isRemove ? 'Remove player?' : 'Unlink account?'}
      </div>
      <div className="text-[12px] text-dim text-center mb-5 px-3 leading-relaxed">
        {isRemove ? (
          <>This removes <b className="text-text">{name}</b> from the league. Match history is preserved.</>
        ) : (
          <>The user account stays, but <b className="text-text">{name}</b> becomes a guest profile you control.</>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl bg-alt border border-line text-accent text-[13px] font-bold cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 min-h-[44px] rounded-xl bg-error text-white text-[13px] font-bold cursor-pointer border-0"
        >
          {isRemove ? 'Remove' : 'Unlink'}
        </button>
      </div>
    </Sheet>
  )
}

// ── LinkSheet ──────────────────────────────────────────────────────────────────
function LinkSheet({ player, members, onCancel, onConfirm }) {
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => { setSelectedUserId('') }, [player?.id])

  if (!player) return null
  const name = player.displayName || player.name

  return (
    <Sheet open={true} onClose={onCancel}>
      <div className="w-12 h-12 rounded-full bg-free/10 flex items-center justify-center text-free mx-auto mb-3">
        <LinkIcon size={22} />
      </div>
      <div className="text-[17px] font-bold text-text text-center mb-1.5">Link account</div>
      <div className="text-[12px] text-dim text-center mb-4 px-3 leading-relaxed">
        Select a member to link to <b className="text-text">{name}</b>.
      </div>

      {members.length === 0 ? (
        <div className="text-[12px] text-dim text-center py-4 bg-bg border border-line rounded-xl mb-4">
          No unlinked members available
        </div>
      ) : (
        <div className="bg-bg border border-line rounded-xl overflow-hidden mb-4">
          {members.map((m, i, arr) => (
            <div
              key={m.userId}
              onClick={() => setSelectedUserId(m.userId)}
              className={`flex items-center gap-3 px-3.5 py-3 min-h-[44px] cursor-pointer transition-colors ${selectedUserId === m.userId ? 'bg-free/10' : 'active:bg-alt/50'} ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-alt flex items-center justify-center text-[12px] font-bold text-text flex-shrink-0">
                {(m.fullName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text truncate">{m.fullName || 'Unknown'}</div>
                <div className="text-[11px] text-dim capitalize">{m.role}</div>
              </div>
              {selectedUserId === m.userId && (
                <span className="text-free"><CheckIcon size={16} /></span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl bg-alt border border-line text-accent text-[13px] font-bold cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => selectedUserId && onConfirm(selectedUserId)}
          disabled={!selectedUserId}
          className="flex-1 min-h-[44px] rounded-xl bg-free text-white text-[13px] font-bold cursor-pointer border-0 disabled:opacity-50"
        >
          Link
        </button>
      </div>
    </Sheet>
  )
}

// ── Add Player Sheet ───────────────────────────────────────────────────────────
function AddPlayerSheet({ open, onClose, onAdd }) {
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
          <XIcon size={14} />
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function LeaguePlayersTab({ league, isAdmin, onAdd, onDelete, onUpdate }) {
  const [search,      setSearch]      = useState('')
  const [selectedId,  setSelectedId]  = useState(null)
  const [confirm,     setConfirm]     = useState(null) // { kind: 'remove'|'unlink', player }
  const [linkTarget,  setLinkTarget]  = useState(null) // player being linked
  const [toast,       setToast]       = useState('')
  const [showAdd,     setShowAdd]     = useState(false)

  const allPlayers  = league?.players || []
  const linkedCount = allPlayers.filter(p => !!p.userId).length
  const guestCount  = allPlayers.length - linkedCount

  // Members not yet linked to any player
  const unlinkedMembers = (league?.members || []).filter(m =>
    !allPlayers.some(p => p.userId === m.userId)
  )

  const filtered = search.trim()
    ? allPlayers.filter(p => (p.displayName || p.name || '').toLowerCase().includes(search.toLowerCase()))
    : allPlayers
  const sorted = [...filtered].sort((a, b) => (b.points || 0) - (a.points || 0))

  const selected = allPlayers.find(p => p.id === selectedId) || null

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 1800) }

  async function handleSavePlayer(patch) {
    await onUpdate(selectedId, patch)
    showToast('Player updated')
  }

  async function handleConfirm() {
    if (!confirm) return
    if (confirm.kind === 'remove') {
      await onDelete(confirm.player.id)
      setSelectedId(null)
      showToast('Player removed')
    } else {
      await onUpdate(confirm.player.id, { userId: null })
      showToast('Account unlinked')
    }
    setConfirm(null)
  }

  async function handleLinkConfirm(userId) {
    if (!linkTarget) return
    await onUpdate(linkTarget.id, { userId })
    setLinkTarget(null)
    showToast('Account linked')
  }

  return (
    <div className="pt-2">
      {/* Search bar + Add button */}
      <div className="flex gap-2 mb-2.5">
        <div className="flex-1 flex items-center gap-2 bg-surface border border-line rounded-[10px] px-3 py-2.5">
          <SearchIcon />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${allPlayers.length} players…`}
            className="flex-1 bg-transparent text-[12px] text-text outline-none placeholder:text-dim"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="w-[42px] h-[42px] rounded-[10px] bg-surface border border-line flex items-center justify-center text-dim cursor-pointer flex-shrink-0"
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {/* Linked / guest legend */}
      <div className="flex items-center gap-3 text-[10px] text-dim mb-2 mx-0.5">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-[7px] h-[7px] rounded-full bg-success" />
          {linkedCount} linked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-[7px] h-[7px] rounded-full border border-dim" />
          {guestCount} guest
        </span>
        {isAdmin && (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.6px]">Tap to manage</span>
        )}
      </div>

      {/* Player list */}
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        {sorted.length === 0 ? (
          <div className="text-center text-[13px] text-dim py-6">
            {search.trim() ? 'No players found' : 'No players yet'}
          </div>
        ) : (
          sorted.map((p, i, arr) => (
            <div
              key={p.id}
              onClick={() => isAdmin && setSelectedId(p.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${isAdmin ? 'cursor-pointer active:bg-alt/50' : ''} ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
            >
              <Avatar player={p} size={34} dotBorder="#1A2734" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text truncate">{p.displayName || p.name}</div>
                <div className="text-[10px] text-dim mt-0.5">ELO {p.points ?? 0} · {levelCap(p.level)}</div>
              </div>
              {isAdmin && <ChevR />}
            </div>
          ))
        )}
      </div>

      <PlayerDetailSheet
        player={selected}
        onClose={() => setSelectedId(null)}
        onSave={handleSavePlayer}
        onLink={() => setLinkTarget(selected)}
        onUnlink={() => setConfirm({ kind: 'unlink', player: selected })}
        onRemove={() => setConfirm({ kind: 'remove', player: selected })}
      />

      <ConfirmSheet
        confirm={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />

      <LinkSheet
        player={linkTarget}
        members={unlinkedMembers}
        onCancel={() => setLinkTarget(null)}
        onConfirm={handleLinkConfirm}
      />

      <AddPlayerSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={onAdd}
      />

      <Toast message={toast} />
    </div>
  )
}
