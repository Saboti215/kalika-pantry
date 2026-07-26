<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHouseholdStore } from '../stores/household'

const router = useRouter()
const household = useHouseholdStore()

const mode = ref('create') // 'create' | 'join'
const name = ref('')
const code = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit() {
  const value = mode.value === 'create' ? name.value.trim() : code.value.trim()
  if (!value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    if (mode.value === 'create') {
      await household.createHousehold(value)
    } else {
      await household.joinHousehold(value)
    }
    router.push({ name: 'scan' })
  } catch (err) {
    errorMessage.value =
      mode.value === 'join' ? 'Einladungscode nicht gefunden.' : (err.message ?? 'Unbekannter Fehler')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="safe-area-view flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-100">
    <div class="text-center">
      <h1 class="text-2xl font-semibold">Willkommen!</h1>
      <p class="mt-1 text-slate-400">Leg einen Haushalt an oder tritt einem bei.</p>
    </div>

    <div class="flex w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700">
      <button
        type="button"
        class="flex-1 py-3 text-sm font-medium transition"
        :class="mode === 'create' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'"
        @click="mode = 'create'"
      >
        Haushalt erstellen
      </button>
      <button
        type="button"
        class="flex-1 py-3 text-sm font-medium transition"
        :class="mode === 'join' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'"
        @click="mode = 'join'"
      >
        Beitreten
      </button>
    </div>

    <form class="w-full max-w-sm space-y-3" @submit.prevent="submit">
      <input
        v-if="mode === 'create'"
        v-model="name"
        type="text"
        required
        autofocus
        enterkeyhint="done"
        placeholder="z. B. Unser Haushalt"
        class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-lg outline-none focus:border-emerald-500"
      />
      <input
        v-else
        v-model="code"
        type="text"
        required
        autofocus
        enterkeyhint="done"
        placeholder="Einladungscode"
        class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-lg uppercase tracking-widest outline-none focus:border-emerald-500"
      />

      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-medium text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
      >
        {{ isSubmitting ? 'Einen Moment…' : mode === 'create' ? 'Haushalt erstellen' : 'Beitreten' }}
      </button>
      <p v-if="errorMessage" class="text-center text-sm text-red-400">{{ errorMessage }}</p>
    </form>
  </div>
</template>
