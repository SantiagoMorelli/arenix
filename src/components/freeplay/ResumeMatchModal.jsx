export default function ResumeMatchModal({ game, session, onConfirm, onCancel }) {
  const tName = (tid) => session.teams.find(t => t.id === tid)?.name || '?'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
      <div className="bg-surface border border-free rounded-2xl max-w-[320px] w-full p-6 text-center shadow-[0_0_24px_rgba(0,188,212,0.2)]">
        <div className="text-[30px] mb-3">🔄</div>
        <div className="text-[16px] font-bold text-text mb-1">Resume match?</div>
        <div className="text-[12px] text-dim mb-1">
          {tName(game.team1Id)} vs {tName(game.team2Id)}
        </div>
        <div className="text-[11px] text-dim mb-6">You&apos;ll be taken to the match setup screen.</div>
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-free text-white font-bold rounded-xl mb-3 border-0 cursor-pointer active:scale-[0.98] transition-transform"
        >
          Resume Match
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 bg-bg text-dim font-bold rounded-xl border border-line cursor-pointer active:opacity-70 transition-opacity"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
