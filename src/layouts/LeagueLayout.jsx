/**
 * LeagueLayout — shell for screens nested under /league/:id.
 *
 * Currently LeagueDetail.jsx carries its own 4-tab BottomNav so this layout
 * is a thin Outlet wrapper.  Once league data is wired the nav and any shared
 * league header can be lifted here.
 */
import { Outlet } from 'react-router-dom'

export default function LeagueLayout() {
  return (
    <div className="bg-bg min-h-screen text-text">
      <Outlet />
    </div>
  )
}
