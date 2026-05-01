export default function StatusBadge({ tournament }) {
  const { phase, status } = tournament
  if (status === 'completed')
    return <span className="text-[10px] font-bold text-dim bg-alt px-2.5 py-1 rounded-lg shrink-0">Done</span>
  if (['group', 'knockout', 'freeplay'].includes(phase))
    return <span className="text-[10px] font-bold text-success bg-success/20 px-2.5 py-1 rounded-lg shrink-0">LIVE</span>
  return <span className="text-[10px] font-bold text-accent bg-accent/15 px-2.5 py-1 rounded-lg shrink-0">SETUP</span>
}
