import Landing from './Landing'
import { useStartupRedirect } from '../hooks/useStartupRedirect'

export default function Home() {
  const { deciding } = useStartupRedirect()

  if (deciding) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <Landing />
}
