import { useNavigate, useParams } from 'react-router-dom'

export default function FreePlayLiveMatch() {
  const navigate = useNavigate()
  const { id } = useParams()
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2 px-6">
      <div className="text-[18px] font-bold">Live Match</div>
      <div className="text-[13px] text-dim">Coming soon</div>
      <button onClick={() => navigate(`/free-play/${id}`)} className="mt-4 text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer">
        ← Back
      </button>
    </div>
  )
}
