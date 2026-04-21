import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionLabel } from '../components/ui-new'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAuth } from '../contexts/AuthContext'

// ─── Inline SVG icons ────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)

const BackIcon    = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const MoonIcon    = () => <Svg><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></Svg>
const BellIcon    = () => <Svg><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></Svg>
const TrophyIcon  = () => (
  <Svg>
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 1012 0V2z"/>
  </Svg>
)
const StarIcon    = () => <Svg><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>
const UserIcon    = () => <Svg><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4" /></Svg>
const MailIcon    = () => <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></Svg>
const LockIcon    = () => <Svg><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></Svg>
const LogOutIcon  = () => <Svg><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>
const TrashIcon   = () => <Svg><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></Svg>
const ArrowIcon   = () => <Svg size={16}><polyline points="9 18 15 12 9 6" /></Svg>

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on, onClick, colorOn = 'bg-accent' }) {
  return (
    <div
      onClick={onClick}
      className={`
        w-[42px] h-6 rounded-full p-0.5
        flex items-center
        transition-all duration-150
        cursor-pointer
        ${on ? `${colorOn} justify-end` : 'bg-alt justify-start'}
      `}
    >
      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
    </div>
  )
}

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({ icon, iconColor = 'text-dim', label, right, border = true, onClick }) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${border ? 'border-b border-line' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`w-[34px] h-[34px] rounded-[10px] bg-alt flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <span className="flex-1 text-[13px] font-semibold text-text">{label}</span>
      {right}
    </div>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate()
  const { signOut, profile, isSuperAdmin } = useAuth()
  const [isDark, setIsDark] = useLocalStorage("arenix-dark", false);
  const [allUsers, setAllUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch users if superadmin
  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingUsers(true)
      import('../lib/supabase').then(({ supabase }) => {
        supabase.from('profiles').select('*').order('full_name').then(({ data }) => {
          if (data) setAllUsers(data)
          setLoadingUsers(false)
        })
      })
    }
  }, [isSuperAdmin])

  const toggleCreateLeague = async (userId, currentVal) => {
    const nextVal = !currentVal
    // Optimistic update
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, can_create_league: nextVal } : u))
    
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.from('profiles').update({ can_create_league: nextVal }).eq('id', userId)
    if (error) {
      console.error('Failed to update permission:', error)
      // Revert on error
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, can_create_league: currentVal } : u))
    }
  }

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Back arrow header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0 text-text">
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1"
        >
          <BackIcon />
        </button>
        <span className="text-[18px] font-bold">Settings</span>
      </div>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Appearance ── */}
          <SectionLabel color="accent">Appearance</SectionLabel>
          <div className="bg-surface rounded-xl px-3.5 py-1 border border-line mb-4">
            <SettingsRow
              icon={<MoonIcon />}
              iconColor="text-accent"
              label="Dark Mode"
              right={<Toggle on={isDark} colorOn="bg-accent" onClick={toggleDark} />}
              border={false}
            />
          </div>

          {/* ── Notifications ── */}
          <SectionLabel color="accent">Notifications</SectionLabel>
          <div className="bg-surface rounded-xl px-3.5 py-1 border border-line mb-4">
            <SettingsRow
              icon={<BellIcon />}
              iconColor="text-free"
              label="Match Reminders"
              right={<Toggle on={true} colorOn="bg-free" />}
            />
            <SettingsRow
              icon={<TrophyIcon />}
              iconColor="text-free"
              label="Tournament Updates"
              right={<Toggle on={true} colorOn="bg-free" />}
            />
            <SettingsRow
              icon={<StarIcon />}
              iconColor="text-free"
              label="League Invites"
              right={<Toggle on={false} colorOn="bg-free" />}
              border={false}
            />
          </div>

          {/* ── Account ── */}
          <SectionLabel color="accent">Account</SectionLabel>
          <div className="bg-surface rounded-xl px-3.5 py-1 border border-line mb-4">
            <SettingsRow
              icon={<UserIcon />}
              label="Edit Profile"
              right={<span className="text-dim"><ArrowIcon /></span>}
              onClick={() => navigate('/edit-profile')}
            />
            <SettingsRow
              icon={<MailIcon />}
              label="Email"
              right={<span className="text-[11px] text-dim truncate max-w-[140px]">{profile?.full_name || '—'}</span>}
            />
            <SettingsRow
              icon={<LockIcon />}
              label="Change Password"
              right={<span className="text-dim"><ArrowIcon /></span>}
              border={false}
            />
          </div>

          {/* ── Danger zone ── */}
          <div className="bg-surface rounded-xl px-3.5 py-1 border border-line mb-3">
            <SettingsRow
              icon={<LogOutIcon />}
              iconColor="text-error"
              label="Log Out"
              right={
                <button
                  onClick={async () => {
                    navigate('/', { replace: true })
                    await signOut()
                  }}
                  className="text-error text-[12px] font-bold bg-transparent border-0 cursor-pointer"
                >
                  Sign out
                </button>
              }
            />
            <SettingsRow
              icon={<TrashIcon />}
              iconColor="text-error"
              label="Delete Account"
              right={<span className="text-error"><ArrowIcon /></span>}
              border={false}
            />
          </div>

          {/* ── Admin Area ── */}
          {isSuperAdmin && (
            <>
              <SectionLabel color="error">Admin: User Permissions</SectionLabel>
              <div className="bg-surface rounded-xl border border-line mb-3 overflow-hidden">
                {loadingUsers ? (
                  <div className="text-[13px] text-dim py-3 text-center">Loading users...</div>
                ) : allUsers.length > 0 ? (
                  allUsers.map((u, i) => (
                    <div key={u.id} className={`px-3.5 py-1 ${i < allUsers.length - 1 ? 'border-b border-line' : ''}`}>
                      <SettingsRow
                        icon={<UserIcon />}
                        label={
                          <div className="flex flex-col">
                            <span className="text-[13px] text-text font-medium">{u.full_name || 'Unknown'}</span>
                            <span className="text-[10px] text-dim">{u.email || u.id.slice(0, 8)}</span>
                          </div>
                        }
                        right={
                          <Toggle
                            on={u.can_create_league}
                            onClick={() => toggleCreateLeague(u.id, u.can_create_league)}
                          />
                        }
                        border={false}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-[13px] text-dim py-3 text-center">No users found</div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

    </div>
  )
}
