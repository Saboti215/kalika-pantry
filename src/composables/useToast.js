import { ref } from 'vue'

// Module-level shared state (not a Pinia store - this is simple enough that
// a plain reactive singleton is clearer than the ceremony of a full store),
// following Vue's own recommended pattern for small shared state.
const toasts = ref([])
let nextId = 0

const DEFAULT_DURATION_MS = 3000

export function useToast() {
  function showToast(message, type = 'info') {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => dismissToast(id), DEFAULT_DURATION_MS)
  }

  function dismissToast(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, showToast, dismissToast }
}
