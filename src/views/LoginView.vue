<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const email = ref('')
const status = ref('idle') // idle | sending | sent | error
const errorMessage = ref('')

async function submit() {
  if (!email.value) return

  status.value = 'sending'
  errorMessage.value = ''

  try {
    await auth.signInWithMagicLink(email.value)
    status.value = 'sent'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err.message ?? 'Unbekannter Fehler'
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-6 text-slate-100">
    <div class="text-center">
      <h1 class="text-3xl font-semibold">Kalika Pantry</h1>
      <p class="mt-2 text-slate-400">Dein Haushaltsvorrat, immer im Blick.</p>
    </div>

    <form v-if="status !== 'sent'" class="w-full max-w-sm space-y-3" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        autofocus
        autocomplete="email"
        inputmode="email"
        enterkeyhint="send"
        placeholder="deine@email.de"
        class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-lg outline-none focus:border-emerald-500"
      />
      <button
        type="submit"
        :disabled="status === 'sending'"
        class="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-medium text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
      >
        {{ status === 'sending' ? 'Wird gesendet…' : 'Login-Link senden' }}
      </button>
      <p v-if="status === 'error'" class="text-center text-sm text-red-400">{{ errorMessage }}</p>
    </form>

    <div v-else class="max-w-sm text-center">
      <p class="text-lg">📬 Check deine E-Mails!</p>
      <p class="mt-2 text-slate-400">
        Wir haben einen Login-Link an <strong class="text-slate-200">{{ email }}</strong> geschickt. Öffne ihn auf
        diesem Gerät.
      </p>
    </div>
  </div>
</template>
