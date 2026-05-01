export default function StandingsTable({ rows }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      {/* Column headers */}
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
        <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
        <span className="flex-1  text-[10px] font-bold text-dim">TEAM</span>
        <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
        <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PF</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PA</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PD</span>
        <span className="w-8 text-center text-[10px] font-bold text-dim">PTS</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-[13px] text-dim py-4">No data yet</div>
      ) : rows.map((row, i) => (
        <div
          key={row.id}
          className={`
            flex items-center px-3.5 py-2.5
            ${i < rows.length - 1 ? 'border-b border-line' : ''}
            ${i === 0 ? 'bg-accent/15' : ''}
          `}
        >
          <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-accent' : 'text-dim'}`}>
            {i + 1}
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
            {row.playerNames && (
              <div className="text-[10px] text-dim mt-0.5 truncate">{row.playerNames}</div>
            )}
          </div>
          <span className="w-6 text-center text-[13px] font-semibold text-success">{row.wins}</span>
          <span className="w-6 text-center text-[13px] font-semibold text-error">{row.losses}</span>
          <span className="w-7 text-center text-[13px] font-semibold text-text">{row.pf}</span>
          <span className="w-7 text-center text-[13px] font-semibold text-text">{row.pa}</span>
          <span className={`w-7 text-center text-[13px] font-semibold ${row.pd > 0 ? 'text-success' : row.pd < 0 ? 'text-error' : 'text-text'}`}>
            {row.pd > 0 ? '+' + row.pd : row.pd}
          </span>
          <span className="w-8 text-center text-[13px] font-bold text-accent">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}
