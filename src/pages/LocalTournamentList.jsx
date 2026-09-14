/**
 * LocalTournamentList — /local
 *
 * Every device-only tournament stored on this phone. Open to guests: the whole
 * point is that it works with no account and no signal.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, WifiOff, Trash2, ChevronLeft } from 'lucide-react'
import {
  getLocalTournaments,
  deleteLocalTournament,
} from '../services/localTournamentService'
import { isLocalStoreAvailable } from '../lib/localStore'
import { AppButton, ConfirmModal, BallSpinner } from '../components/ui-new'
import { formatDateDisplay } from '../lib/teamBuilder'
import { useToast } from '../contexts/ToastContext'

function statusLabel(t) {
  if (t.status === 'completed') return { text: 'Finished', cls: 'bg-dim/15 text-dim' }
  if (t.phase === 'knockout')   return { text: 'Knockout', cls: 'bg-accent/15 text-accent' }
  return { text: 'In progress', cls: 'bg-success/15 text-success' }
}

export default function LocalTournamentList() {
  const navigate = useNavigate()
  const { showError } = useToast()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getLocalTournaments())
    } catch (err) {
      showError(err, 'Could not read tournaments stored on this device')
    } finally {
      setLoading(false)
    }
  // showError identity is stable enough here; re-running on it would loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (t) => setConfirm({
    title: 'Delete tournament?',
    message: `"${t.name}" is stored only on this device. Deleting it cannot be undone.`,
    onConfirm: async () => {
      setConfirm(null)
      try {
        await deleteLocalTournament(t.id)
        setItems(prev => prev.filter(x => x.id !== t.id))
      } catch (err) {
        showError(err, 'Could not delete the tournament')
      }
    },
  })

  if (!isLocalStoreAvailable()) {
    return (
      <div className="screen bg-bg text-text flex flex-col items-center justify-center p-6 text-center gap-2">
        <div className="text-[18px] font-bold">Not available here</div>
        <div className="text-[13px] text-dim max-w-[300px]">
          This browser has no local storage available, so a tournament could not
          be saved. Private browsing is the usual cause.
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="screen bg-bg text-text">
      <div className="screen__top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-line cursor-pointer text-text flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold leading-tight">Local tournaments</div>
            <div className="text-[11px] text-dim">Stored on this phone only</div>
          </div>
        </div>
      </div>

      <main className="screen__body">
        <div className="px-4 pb-8 max-w-[430px] mx-auto w-full flex flex-col gap-3">

          <div className="flex items-start gap-3 px-4 py-3 bg-surface border border-line rounded-[14px]">
            <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <WifiOff size={18} />
            </div>
            <div className="flex-1 min-w-0 text-[11px] text-dim leading-snug">
              Runs with no signal and no account. Nothing here syncs, counts
              towards Elo, or appears in a league — and it lives only in this
              browser, so export a tournament you want to keep.
            </div>
          </div>

          <AppButton onClick={() => navigate('/local/new')} className="w-full">
            <span className="inline-flex items-center justify-center gap-2">
              <Plus size={18} /> New local tournament
            </span>
          </AppButton>

          {loading ? (
            <div className="flex justify-center py-10"><BallSpinner size={32} /></div>
          ) : items.length === 0 ? (
            <div className="text-[13px] text-dim text-center py-10">
              No local tournaments on this device yet.
            </div>
          ) : (
            items.map(t => {
              const badge = statusLabel(t)
              return (
                <div
                  key={t.id}
                  className="bg-surface border border-line rounded-[14px] p-4 flex items-center gap-3"
                >
                  <button
                    onClick={() => navigate(`/local/${t.id}`)}
                    className="flex-1 min-w-0 text-left bg-transparent border-0 cursor-pointer p-0"
                  >
                    <div className="text-[14px] font-bold text-text truncate">{t.name}</div>
                    <div className="text-[11px] text-dim mt-0.5">
                      {formatDateDisplay(t.date)} · {t.teams?.length || 0} teams
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    aria-label={`Delete ${t.name}`}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-transparent border-0 text-dim cursor-pointer shrink-0 active:text-error"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </main>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        confirmVariant="error"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
