import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const isReady = ref(false)
  let initPromise = null

  const isAuthenticated = computed(() => !!session.value)
  const userEmail = computed(() => session.value?.user?.email ?? null)
  const userId = computed(() => session.value?.user?.id ?? null)

  // Idempotent: safe to call from multiple router guards without re-subscribing.
  function init() {
    if (initPromise) return initPromise

    initPromise = supabase.auth.getSession().then(({ data }) => {
      session.value = data.session

      supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
      })

      isReady.value = true
    })

    return initPromise
  }

  async function signInWithMagicLink(email) {
    // Redirect back to wherever the app is currently hosted (localhost during
    // dev, the GitHub Pages URL in production) - without the hash route, so
    // Supabase's ?code=... query param lands before vue-router's #/ segment.
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
  }

  return {
    session,
    isReady,
    isAuthenticated,
    userEmail,
    userId,
    init,
    signInWithMagicLink,
    signOut,
  }
})
