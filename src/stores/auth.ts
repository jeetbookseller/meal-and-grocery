import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
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
    }
    loading.value = false
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
  }

  return { user, session, loading, error, init, login, signup, logout }
})
