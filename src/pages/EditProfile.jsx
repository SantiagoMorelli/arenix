import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { uploadAvatar } from '../services/profileService'

// ─── SVG icons ────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon   = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const CameraIcon = () => (
  <Svg size={22}>
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </Svg>
)

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-dim">{label}</span>
      {children}
    </div>
  )
}

// ─── Gender pill selector ──────────────────────────────────────────────────────
function GenderPills({ value, onChange }) {
  const options = [
    { id: 'male',   label: 'Male'   },
    { id: 'female', label: 'Female' },
    { id: 'other',  label: 'Other'  },
  ]
  return (
    <div className="flex bg-alt rounded-[10px] p-[3px]">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`
            flex-1 py-2 rounded-[8px] text-[13px] font-semibold
            cursor-pointer border-0 transition-colors
            ${value === o.id
              ? 'bg-surface text-accent shadow-sm'
              : 'bg-transparent text-dim'}
          `}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Avatar display ────────────────────────────────────────────────────────────
function AvatarDisplay({ src, initial }) {
  if (src) {
    return (
      <img
        src={src}
        alt="avatar"
        className="w-24 h-24 rounded-2xl object-cover"
      />
    )
  }
  return (
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-free flex items-center justify-center text-[36px] font-extrabold text-white">
      {initial}
    </div>
  )
}

// ─── Edit Profile page ────────────────────────────────────────────────────────
export default function EditProfile() {
  const navigate  = useNavigate()
  const { profile, updateProfile } = useAuth()

  const [form, setForm] = useState({
    full_name: '',
    nickname:  '',
    gender:    '',
    country:   '',
  })
  const [photoFile,    setPhotoFile]    = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        nickname:  profile.nickname  || '',
        gender:    profile.gender    || '',
        country:   profile.country   || '',
      })
      if (profile.avatar_url?.startsWith('http')) {
        setPhotoPreview(profile.avatar_url)
      }
    }
  }, [profile])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      setError('Full name must be at least 2 characters.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      let avatarUrl = profile?.avatar_url || null

      if (photoFile) {
        const { publicUrl, error: uploadErr } = await uploadAvatar(profile.id, photoFile)
        if (uploadErr) throw uploadErr
        avatarUrl = publicUrl
      }

      const { error: saveErr } = await updateProfile({
        full_name:  form.full_name.trim(),
        nickname:   form.nickname.trim() || null,
        gender:     form.gender  || null,
        country:    form.country.trim() || null,
        avatar_url: avatarUrl,
      })
      if (saveErr) throw saveErr

      navigate(-1)
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initial = (form.nickname || form.full_name || '?')[0].toUpperCase()
  const currentPreview = photoPreview

  return (
    <div className="screen bg-bg text-text">

      {/* ── Header ── */}
      <div className="screen__top flex items-center gap-2.5 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
        >
          <BackIcon />
        </button>
        <span className="text-[18px] font-bold">Edit Profile</span>
      </div>

      {/* ── Scrollable content ── */}
      <main className="screen__body">
        <div className="px-4 pb-8 flex flex-col gap-5">

          {/* ── Avatar picker ── */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div
              className="relative cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <AvatarDisplay src={currentPreview} initial={initial} />
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center text-white">
                <CameraIcon />
              </div>
            </div>
            <span className="text-[12px] text-dim">Tap to change photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* ── Nickname ── */}
          <Field label="Nickname">
            <input
              type="text"
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              placeholder="e.g. Santi"
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-accent"
            />
          </Field>

          {/* ── Full name ── */}
          <Field label="Full Name">
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. Santiago Morelli"
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-accent"
            />
          </Field>

          {/* ── Gender ── */}
          <Field label="Gender">
            <GenderPills
              value={form.gender}
              onChange={val => setForm(f => ({ ...f, gender: val }))}
            />
          </Field>

          {/* ── Country ── */}
          <Field label="Country">
            <input
              type="text"
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              placeholder="e.g. Argentina"
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-accent"
            />
          </Field>

          {/* ── Error ── */}
          {error && (
            <div className="text-[13px] text-error bg-error/10 border border-error/30 rounded-xl px-3.5 py-3">
              {error}
            </div>
          )}

          {/* ── Save ── */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-accent text-white font-bold text-[14px] py-3.5 rounded-xl cursor-pointer border-0 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

        </div>
      </main>

    </div>
  )
}
