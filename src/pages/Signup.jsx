import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const UserIcon = () => <Svg><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></Svg>
const MailIcon = () => <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></Svg>
const LockIcon = () => <Svg><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></Svg>

export default function Signup() {
  const navigate    = useNavigate()
  const { session } = useAuth()

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center px-6 text-center">
        <div className="text-[48px] mb-4">📬</div>
        <div className="text-[20px] font-bold text-text mb-2">Check your inbox</div>
        <div className="text-[13px] text-dim max-w-[280px]">
          We sent a confirmation link to <span className="font-semibold text-text">{email}</span>. Click it to activate your account.
        </div>
        <button
          onClick={() => navigate('/login')}
          className="mt-8 px-6 py-3 rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text items-center justify-center px-6">

      <div className="text-[32px] font-black text-accent tracking-widest uppercase mb-1">
        ARENIX
      </div>
      <div className="text-[13px] text-dim mb-10">Beach Volleyball Tournament Manager</div>

      <div className="w-full max-w-[360px] bg-surface border border-line rounded-2xl p-6">

        <h1 className="text-[20px] font-bold text-text mb-5">Create account</h1>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error text-[12px] font-semibold rounded-xl px-3.5 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Full name</span>
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors">
              <span className="text-dim flex-shrink-0"><UserIcon /></span>
              <input
                type="text" required autoComplete="name"
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-dim/50"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Email</span>
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors">
              <span className="text-dim flex-shrink-0"><MailIcon /></span>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-dim/50"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Password</span>
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors">
              <span className="text-dim flex-shrink-0"><LockIcon /></span>
              <input
                type="password" required autoComplete="new-password" minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-dim/50"
              />
            </div>
          </label>

          <button
            type="submit" disabled={loading}
            className="w-full min-h-[46px] rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer mt-1 disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[12px] text-dim mt-5">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-accent font-semibold bg-transparent border-0 cursor-pointer p-0"
          >
            Sign in
          </button>
        </p>

      </div>
    </div>
  )
}
