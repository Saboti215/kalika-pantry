<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const step = ref('email') // 'email' | 'code'
const email = ref('')
const code = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const codeInputRef = ref(null)

async function requestCode() {
  if (!email.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await auth.requestLoginCode(email.value)
    step.value = 'code'
    code.value = ''
    await nextTick()
    codeInputRef.value?.focus()
  } catch (err) {
    errorMessage.value = err.message ?? 'Unbekannter Fehler'
  } finally {
    isSubmitting.value = false
  }
}

async function verifyCode() {
  if (!code.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await auth.verifyLoginCode(email.value, code.value)
    // The router guard only runs on an actual navigation - updating
    // session.value alone wouldn't move us off /login, so push explicitly.
    // If there's no household yet, the guard redirects to onboarding itself.
    await router.push({ name: 'scan' })
  } catch {
    errorMessage.value = 'Code ungültig oder abgelaufen.'
  } finally {
    isSubmitting.value = false
  }
}

function changeEmail() {
  step.value = 'email'
  code.value = ''
  errorMessage.value = ''
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-6 text-slate-100">
    <div class="text-center">
      <h1 class="text-3xl font-semibold">Kalika Pantry</h1>
      <p class="mt-2 text-slate-400">Dein Haushaltsvorrat, immer im Blick.</p>
    </div>

    <form v-if="step === 'email'" class="w-full max-w-sm space-y-3" @submit.prevent="requestCode">
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
        :disabled="isSubmitting"
        class="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-medium text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
      >
        {{ isSubmitting ? 'Wird gesendet…' : 'Code anfordern' }}
      </button>
      <p v-if="errorMessage" class="text-center text-sm text-red-400">{{ errorMessage }}</p>
    </form>

    <form v-else class="w-full max-w-sm space-y-3 text-center" @submit.prevent="verifyCode">
      <p class="text-slate-300">
        Wir haben einen Code an <strong class="text-slate-100">{{ email }}</strong> geschickt.
      </p>
      <input
        ref="codeInputRef"
        v-model="code"
        type="text"
        required
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="8"
        enterkeyhint="done"
        placeholder="12345678"
        class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-center text-xl tracking-[0.35em] outline-none focus:border-emerald-500"
      />
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-medium text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
      >
        {{ isSubmitting ? 'Prüfe…' : 'Bestätigen' }}
      </button>
      <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>

      <p class="text-sm text-slate-500">Der Link in der E-Mail funktioniert alternativ auch.</p>

      <div class="flex justify-center gap-4 text-sm">
        <button type="button" class="text-emerald-400" @click="requestCode">Code erneut senden</button>
        <button type="button" class="text-slate-400" @click="changeEmail">Andere E-Mail-Adresse</button>
      </div>
    </form>
  </div>
</template>
