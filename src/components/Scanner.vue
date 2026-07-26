<script setup>
import { ref } from 'vue'
import { useScanner } from '../composables/useScanner'

const emit = defineEmits(['decoded'])
const containerRef = ref(null)

const { errorMessage, pause, resume } = useScanner({
  containerRef,
  onDecoded: (text) => emit('decoded', text),
})

defineExpose({ pause, resume })
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-black">
    <div ref="containerRef" class="scanner-viewport relative h-full w-full" />

    <p v-if="errorMessage" class="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-red-400">
      {{ errorMessage }}
    </p>

    <!-- Matches the inputStream.area passed to Quagga - what's framed here is
         exactly what gets scanned, not just a decorative aiming aid. -->
    <div
      class="pointer-events-none absolute rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      style="top: 30%; bottom: 30%; left: 8%; right: 8%"
    />
  </div>
</template>

<style scoped>
/* Quagga2 injects <video>/<canvas> into the target element sized to the
   camera stream's native resolution - force them to fill the viewport
   instead, matching an object-fit:cover look. */
.scanner-viewport :deep(video),
.scanner-viewport :deep(canvas) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
