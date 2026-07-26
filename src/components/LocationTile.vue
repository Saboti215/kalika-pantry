<script setup>
defineProps({
  name: { type: String, required: true },
  icon: { type: String, default: '📦' },
})
defineEmits(['select'])
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 py-6 text-center transition active:scale-95 active:bg-slate-700"
    @click="$emit('select')"
  >
    <span class="text-3xl">{{ icon }}</span>
    <span class="text-sm font-medium">{{ name }}</span>
  </button>
</template>
