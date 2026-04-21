import { createClient } from '@supabase/supabase-js'

const normalizeEnv = (value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()

  // Vercel env UI stores quotes literally if pasted with them.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

const supabaseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

const parsedUrl = (() => {
  try {
    return new URL(supabaseUrl)
  } catch {
    return null
  }
})()

if (!parsedUrl || !['http:', 'https:'].includes(parsedUrl.protocol)) {
  throw new Error('Invalid VITE_SUPABASE_URL: must be a valid HTTP or HTTPS URL')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
