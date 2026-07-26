<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useHouseholdStore } from '../../stores/household'
import BottomSheet from './BottomSheet.vue'
import ProductAvatar from '../ProductAvatar.vue'

// Fall A: product and location are both already known - the 0-click flow.
const props = defineProps({
  stock: { type: Object, required: true }, // { ean, product, location, quantity }
})
const emit = defineEmits(['close'])

const household = useHouseholdStore()
const quantity = ref(props.stock.quantity)
const errorMessage = ref('')
let closeTimeoutId = null

// Gives the user a brief glimpse of the updated count before the sheet
// closes and the camera takes back over - a rapid second tap just pushes
// the auto-close out further instead of closing early.
function scheduleClose() {
  clearTimeout(closeTimeoutId)
  // Reports the settled quantity so callers outside the scan flow (e.g. the
  // Bestand search view) can update their own list without a reload.
  closeTimeoutId = setTimeout(() => emit('close', quantity.value), 450)
}

async function adjust(delta) {
  clearTimeout(closeTimeoutId)
  const previousQuantity = quantity.value
  quantity.value = Math.max(0, quantity.value + delta)
  errorMessage.value = ''

  try {
    await household.adjustStock({ ean: props.stock.ean, locationId: props.stock.location.id, delta })
  } catch {
    quantity.value = previousQuantity
    errorMessage.value = 'Konnte nicht gespeichert werden.'
    return
  }

  scheduleClose()
}

onBeforeUnmount(() => clearTimeout(closeTimeoutId))
</script>

<template>
  <BottomSheet @close="emit('close', quantity)">
    <div class="flex flex-col items-center gap-4 text-center">
      <ProductAvatar :name="stock.product.name" :image-url="stock.product.image_url" :size="72" />
      <div>
        <p class="text-xl font-semibold">{{ stock.product.name }}</p>
        <p class="text-slate-400">{{ stock.location.icon }} {{ stock.location.name }}</p>
      </div>

      <div class="flex w-full items-center justify-between gap-4">
        <button
          type="button"
          class="flex h-24 flex-1 items-center justify-center rounded-2xl bg-slate-800 text-4xl font-bold transition active:scale-95 active:bg-slate-700"
          @click="adjust(-1)"
        >
          −
        </button>
        <span class="w-16 text-4xl font-bold tabular-nums">{{ quantity }}</span>
        <button
          type="button"
          class="flex h-24 flex-1 items-center justify-center rounded-2xl bg-emerald-500 text-4xl font-bold text-slate-950 transition active:scale-95"
          @click="adjust(1)"
        >
          +
        </button>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>
    </div>
  </BottomSheet>
</template>
