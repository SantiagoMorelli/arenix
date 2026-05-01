import { supabase } from '../lib/supabase'

/**
 * Sign in with email + password.
 * Returns the raw Supabase { data, error } shape.
 */
export function signInWithPassword({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Sign up a new user.
 * Returns the raw Supabase { data, error } shape.
 */
export function signUp({ email, password, fullName }) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
}

/**
 * Initiate Google OAuth sign-in.
 * @param {string} redirectTo – absolute URL to land on after auth.
 * Returns the raw Supabase { data, error } shape.
 */
export function signInWithGoogle({ redirectTo }) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

/**
 * Update the current user's password.
 * Returns the raw Supabase { data, error } shape.
 */
export function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}
