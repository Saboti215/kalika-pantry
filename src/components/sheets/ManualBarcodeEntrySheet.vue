<script setup>
import { ref, onMounted, nextTick } from 'vue'
import BottomSheet from './BottomSheet.vue'

// Fallback for when the camera simply can't read a barcode at all (damaged
// print, bad lighting, ...). Typing the EAN here feeds into the exact same
// lookup cascade a camera scan would - the caller treats this identically
// to a decoded barcode.
const emit = defineEmits(['submitted', 'close'])

const ean = ref('')
const inputRef = ref(null)

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

function submit() {
  const trimmedEan = ean.value.trim()
  if (!trimmedEan) return
  emit('submitted', trimmedEan)
}
</script>

<template>
  <BottomSheet @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <p class="text-center text-sm text-slate-400">Barcode manuell eingeben</p>
      <input
        ref="inputRef"
        v-model="ean"
        type="text"
        required
        inputmode="numeric"
        enterkeyhint="done"
        placeholder="Barcode-Nummer…"
        class="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4 text-center text-lg tracking-widest outline-none focus:border-emerald-500"
      />
      <button
        type="submit"
        class="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-medium text-slate-950 transition active:scale-[0.98]"
      >
        Weiter
      </button>
    </form>
  </BottomSheet>
</template>
