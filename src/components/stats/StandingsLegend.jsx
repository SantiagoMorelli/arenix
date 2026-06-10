/**
 * Plain-language legend for the standings tables' abbreviated column
 * headers (W / L / PF / PA / PD / PTS). Rendered as a footer row inside
 * the table card so beginners can decode the columns without help mode.
 */
export default function StandingsLegend() {
  return (
    <div className="px-3.5 py-2 border-t border-line bg-alt/40 text-[10px] text-dim leading-relaxed">
      <span className="font-bold">W</span> wins · <span className="font-bold">L</span> losses ·{' '}
      <span className="font-bold">PF</span> points scored · <span className="font-bold">PA</span> points against ·{' '}
      <span className="font-bold">PD</span> difference · <span className="font-bold">PTS</span> table points
    </div>
  )
}
