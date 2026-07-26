<script setup>
defineProps({
  dismissible: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet" appear>
      <div class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/50" @click="dismissible && emit('close')" />
        <div
          class="sheet-panel absolute inset-x-0 bottom-0 rounded-t-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl"
          style="
            padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
            padding-left: max(1.5rem, env(safe-area-inset-left));
            padding-right: max(1.5rem, env(safe-area-inset-right));
          "
        >
          <div class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700" />
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease-out;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.2s ease-out;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
