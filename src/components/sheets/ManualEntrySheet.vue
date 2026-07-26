<script setup>
import { ref, onMounted, nextTick } from 'vue'
import BottomSheet from './BottomSheet.vue'

// Fall C: the barcode is completely unknown (not in our DB, not on Open Food
// Facts). Just a name field - no image upload, no brand fields - Enter hands
// off straight into the Fall B location grid.
const props = defineProps({
  ean: { type: String, required: true },
})
const emit = defineEmits(['submitted', 'close'])

const name = ref('')
const inputRef = ref(null)

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

function submit() {
  const trimmedName = name.value.trim()
  if (!trimmedName) return
  emit('submitted', { ean: props.ean, name: trimmedName, image_url: null })
}
</script>

<template>
  <BottomSheet @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <p class="text-center text-sm text-slate-400">Unbekannter Barcode</p>
      <input
        ref="inputRef"
        v-model="name"
        type="text"
        required
        enterkeyhint="done"
        placeholder="Produktname eingeben…"
        class="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4 text-lg outline-none focus:border-emerald-500"
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
