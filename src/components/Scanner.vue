<script setup>
import { ref } from 'vue'
import { useScanner } from '../composables/useScanner'

const emit = defineEmits(['decoded'])
const videoRef = ref(null)

const { errorMessage, pause, resume } = useScanner({
  videoRef,
  onDecoded: (text) => emit('decoded', text),
})

defineExpose({ pause, resume })
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-black">
    <video ref="videoRef" class="h-full w-full object-cover" autoplay muted playsinline />

    <p v-if="errorMessage" class="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-red-400">
      {{ errorMessage }}
    </p>

    <!-- Matches CROP_AREA in useScanner.js - what's framed here is exactly
         what gets scanned, not just a decorative aiming aid. -->
    <div
      class="pointer-events-none absolute rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      style="top: 30%; bottom: 30%; left: 8%; right: 8%"
    />
  </div>
</template>
