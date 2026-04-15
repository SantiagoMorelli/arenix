/**
 * MainLayout — shell for screens that share the Home / Profile bottom nav.
 *
 * Currently the individual page files (Home.jsx, Profile.jsx) each carry their
 * own BottomNav so this layout is a thin Outlet wrapper.  Once navigation is
 * fully wired the BottomNav can be lifted here and removed from the pages.
 */
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="bg-bg min-h-screen text-text">
      <Outlet />
    </div>
  )
}
