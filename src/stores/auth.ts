import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const signupPendingConfirmation = ref(false)
  const emailConfirmed = ref(false)
  const resetPasswordSent = ref(false)

  async function init() {
    // Capture hash before Supabase parses and cleans it
    const initialHash = window.location.hash

    // Detect email confirmation redirect (Supabase appends type=signup to hash)
    if (initialHash.includes('type=signup') || initialHash.includes('type=email_change')) {
      emailConfirmed.value = true
    }

    const { data } = await supabase.auth.getSession()

    if (emailConfirmed.value) {
      // User just confirmed email — sign them out so they see login form with message
      await supabase.auth.signOut()
      session.value = null
      user.value = null
    } else {
      session.value = data.session
      user.value = data.session?.user ?? null
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      if (emailConfirmed.value) return
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    signupPendingConfirmation.value = false
    emailConfirmed.value = false
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      error.value = err.message
    } else {
      user.value = data.user
      session.value = data.session
    }
    loading.value = false
  }

  async function signup(email: string, password: string) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    if (err) {
      error.value = err.message
    } else {
      user.value = data.user ?? null
      session.value = data.session ?? null
      if (!data.session) {
        signupPendingConfirmation.value = true
      }
    }
    loading.value = false
  }

  async function resetPassword(email: string) {
    loading.value = true
    error.value = null
    resetPasswordSent.value = false
    const redirectTo = window.location.origin + window.location.pathname
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (err) {
      error.value = err.message
    } else {
      resetPasswordSent.value = true
    }
    loading.value = false
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
  }

  return { user, session, loading, error, signupPendingConfirmation, emailConfirmed, resetPasswordSent, init, login, signup, resetPassword, logout }
})
