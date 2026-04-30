/**
 * GuestHome — landing page for unauthenticated visitors.
 * Shown when a guest hits "/" without a session.
 */
import { useNavigate } from 'react-router-dom'

// ─── Icons ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const TrophyIcon  = ({ size = 22 }) => <Svg size={size}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></Svg>
const LiveIcon    = ({ size = 22 }) => <Svg size={size}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></Svg>
const ShareIcon   = ({ size = 22 }) => <Svg size={size}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Svg>
const LinkIcon    = ({ size = 16 }) => <Svg size={size}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></Svg>

// Beach volleyball ball SVG (used as hero illustration)
function BeachBallIllustration() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      {/* outer circle */}
      <circle cx="60" cy="60" r="54" fill="none" stroke="var(--c-accent)" strokeWidth="3" opacity="0.25" />
      {/* inner glow */}
      <circle cx="60" cy="60" r="44"
        fill="color-mix(in srgb, var(--c-accent) 8%, transparent)"
        stroke="var(--c-accent)" strokeWidth="2" opacity="0.35" />
      {/* ball stripes */}
      <path d="M20 60 Q60 10 100 60" fill="none" stroke="var(--c-accent)" strokeWidth="3.5" opacity="0.6" />
      <path d="M20 60 Q60 110 100 60" fill="none" stroke="var(--c-accent)" strokeWidth="3.5" opacity="0.6" />
      {/* center dot */}
      <circle cx="60" cy="60" r="6" fill="var(--c-accent)" opacity="0.8" />
      {/* floating dots */}
      <circle cx="35" cy="32" r="3" fill="var(--c-free)" opacity="0.5" />
      <circle cx="88" cy="28" r="2" fill="var(--c-accent)" opacity="0.4" />
      <circle cx="95" cy="82" r="3.5" fill="var(--c-free)" opacity="0.3" />
    </svg>
  )
}

// ─── Feature bullet ───────────────────────────────────────────────────────────
function Feature({ icon, title, description }) {
  const IconCmp = icon
  return (
    <div className="flex items-start gap-3.5 px-4 py-3.5 bg-surface border border-line rounded-[14px]">
      <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center text-accent shrink-0 mt-0.5">
        <IconCmp size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-text leading-snug">{title}</div>
        <div className="text-[11px] text-dim mt-0.5 leading-snug">{description}</div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GuestHome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="flex-1 flex flex-col px-5 pt-10 pb-8 max-w-[430px] mx-auto w-full">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-5">
            <BeachBallIllustration />
          </div>

          {/* Wordmark */}
          <div className="font-display text-[42px] leading-none tracking-[-1px] text-text mb-2">
            Arenix
          </div>

          <div className="text-[15px] text-dim leading-snug max-w-[280px]">
            Beach volleyball leagues, tournaments, and pickup games —
            {' '}<span className="text-text font-semibold">scored live, shared with your crew.</span>
          </div>
        </div>

        {/* ── Features ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 mb-8">
          <Feature
            icon={TrophyIcon}
            title="Run tournaments"
            description="Group stages, knockout brackets, and full ELO-based league standings."
          />
          <Feature
            icon={LiveIcon}
            title="Score live"
            description="Track every point as it happens and share the scoreboard in real time."
          />
          <Feature
            icon={ShareIcon}
            title="Share results"
            description="Send a link to anyone — they can follow your league or free play session without an account."
          />
        </div>

        {/* ── CTAs ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => navigate('/login')}
            className="w-full min-h-[50px] rounded-xl bg-accent text-white font-bold text-[15px] border-0 cursor-pointer active:opacity-80 transition-opacity"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="w-full min-h-[50px] rounded-xl bg-surface border border-line text-text font-bold text-[15px] cursor-pointer active:opacity-80 transition-opacity"
          >
            Create account
          </button>
        </div>

        {/* ── Invite link hint ──────────────────────────────────────── */}
        <div className="flex items-start gap-2.5 bg-alt border border-line rounded-[14px] px-4 py-3.5">
          <span className="text-dim shrink-0 mt-0.5"><LinkIcon size={15} /></span>
          <p className="text-[12px] text-dim leading-snug">
            Got an invite link? Open it in your browser to view a public league
            or join a free play session — no account needed to browse.
          </p>
        </div>

      </div>
    </div>
  )
}
