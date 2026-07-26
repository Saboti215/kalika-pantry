<script setup>
import { useToast } from '../composables/useToast'

// Single shared instance across the whole app - mounted once in App.vue.
const { toasts, dismissToast } = useToast()
</script>

<template>
  <div
    v-if="toasts.length > 0"
    class="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-6"
    style="bottom: max(1.5rem, env(safe-area-inset-bottom))"
  >
    <button
      v-for="toast in toasts"
      :key="toast.id"
      type="button"
      class="pointer-events-auto max-w-sm rounded-xl px-4 py-3 text-left text-sm text-white shadow-lg"
      :class="toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'"
      @click="dismissToast(toast.id)"
    >
      {{ toast.message }}
    </button>
  </div>
</template>
