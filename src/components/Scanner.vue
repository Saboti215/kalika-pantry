<script setup>
import { useScanner } from '../composables/useScanner'

const emit = defineEmits(['decoded'])

const { errorMessage, pause, resume, elementId } = useScanner({
  onDecoded: (text) => emit('decoded', text),
})

defineExpose({ pause, resume })
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-black">
    <div :id="elementId" class="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

    <p v-if="errorMessage" class="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-red-400">
      {{ errorMessage }}
    </p>

    <!-- Purely decorative aiming reticle - html5-qrcode reads the full frame. -->
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="h-44 w-64 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
    </div>
  </div>
</template>
