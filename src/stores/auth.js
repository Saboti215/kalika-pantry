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

  // Triggers the login email - which (once the Magic Link template in the
  // Supabase dashboard includes {{ .Token }}) contains both a clickable link
  // and a code redeemable via verifyLoginCode(). Same underlying token
  // either way; the template alone decides what the email shows.
  async function requestLoginCode(email) {
    // Redirect back to wherever the app is currently hosted (localhost during
    // dev, the GitHub Pages URL in production) - without the hash route, so
    // Supabase's ?code=... query param lands before vue-router's #/ segment.
    // Only relevant if the user clicks the link instead of typing the code.
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error
  }

  // Redeems the code from the login email. Sets session.value directly from
  // the response rather than waiting on onAuthStateChange, whose timing
  // relative to this call resolving isn't guaranteed - callers that navigate
  // right after need session.value to already be current at that point.
  async function verifyLoginCode(email, code) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) throw error
    session.value = data.session
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
    requestLoginCode,
    verifyLoginCode,
    signOut,
  }
})
