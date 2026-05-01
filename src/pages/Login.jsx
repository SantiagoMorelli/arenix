import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { signInWithPassword, signInWithGoogle } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const MailIcon = () => <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></Svg>
const LockIcon = () => <Svg><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></Svg>

export default function Login() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const { session }    = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const nextPath = params.get('next') || '/'

  // Already logged in → redirect immediately
  useEffect(() => {
    if (session) navigate(nextPath, { replace: true })
  }, [session, nextPath, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate(nextPath, { replace: true })
  }

  async function handleGoogle() {
    setError('')
    const { error } = await signInWithGoogle({
      redirectTo: window.location.origin + nextPath,
    })
    if (error) setError(error.message)
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text items-center justify-center px-6">

      {/* Logo / brand */}
      <div className="text-[32px] font-black text-accent tracking-widest uppercase mb-1">
        ARENIX
      </div>
      <div className="text-[13px] text-dim mb-10">Beach Volleyball Tournament Manager</div>

      {/* Card */}
      <div className="w-full max-w-[360px] bg-surface border border-line rounded-2xl p-6">

        <h1 className="text-[20px] font-bold text-text mb-5">Sign in</h1>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error text-[12px] font-semibold rounded-xl px-3.5 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Email */}
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

          {/* Password */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Password</span>
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors">
              <span className="text-dim flex-shrink-0"><LockIcon /></span>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-dim/50"
              />
            </div>
          </label>

          <button
            type="submit" disabled={loading}
            className="w-full min-h-[46px] rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer mt-1 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-line" />
          <span className="text-[11px] text-dim">or</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full min-h-[46px] rounded-xl bg-alt border border-line text-text font-semibold text-[14px] cursor-pointer flex items-center justify-center gap-2.5"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* Sign up link */}
        <p className="text-center text-[12px] text-dim mt-5">
          No account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-accent font-semibold bg-transparent border-0 cursor-pointer p-0"
          >
            Create one
          </button>
        </p>

      </div>
    </div>
  )
}
