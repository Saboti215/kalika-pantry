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
    class="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-center transition active:scale-95 active:bg-slate-700"
    @click="$emit('select')"
  >
    <span class="text-xl">{{ icon }}</span>
    <span class="truncate px-1 text-xs font-medium">{{ name }}</span>
  </button>
</template>
