import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// The new-style "sb_publishable_..." key (Settings -> API Keys) - a drop-in
// replacement for the legacy JWT-based anon key, passed the same way.
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // PKCE puts the auth code in a query param (?code=...) instead of a URL
    // hash fragment, which would otherwise collide with vue-router's hash
    // mode (#/route) on the magic-link redirect.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
  },
})
