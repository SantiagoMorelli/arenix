import Landing from './Landing'
import { useStartupRedirect } from '../hooks/useStartupRedirect'
import { BallSpinner } from '../components/ui-new'

export default function Home() {
  const { deciding } = useStartupRedirect()

  if (deciding) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <BallSpinner size={36} />
      </div>
    )
  }

  return <Landing />
}
