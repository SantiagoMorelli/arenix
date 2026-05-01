export default function ScorerConflictModal({ scorerName, onGoBack, onContinue }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
      <div className="bg-surface border border-line p-6 rounded-2xl max-w-[320px] w-full text-center">
        <div className="text-[32px] mb-3">⚠️</div>
        <div className="text-[16px] font-bold mb-2 text-text">Already being scored</div>
        <div className="text-[13px] text-dim mb-6">
          <strong className="text-text">{scorerName}</strong> is already scoring this match.
          If you continue, only the first saved result will count.
        </div>
        <button
          onClick={onGoBack}
          className="w-full py-3 bg-bg border border-line text-text font-bold rounded-xl mb-3 cursor-pointer"
        >
          Go Back
        </button>
        <button
          onClick={onContinue}
          className="w-full py-3 bg-accent text-white font-bold rounded-xl border-0 cursor-pointer"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  )
}
