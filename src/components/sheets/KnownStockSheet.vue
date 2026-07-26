<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useHouseholdStore } from '../../stores/household'
import BottomSheet from './BottomSheet.vue'
import ProductAvatar from '../ProductAvatar.vue'

// Fall A: the product is known and already sits at one or more locations -
// the 0-click flow. One adjustable row per location, so a product stocked
// in several places lets the user pick which one to +1/-1 without guessing.
const props = defineProps({
  stock: { type: Object, required: true }, // { ean, product, stocks: [{ location, quantity }] }
})
const emit = defineEmits(['close', 'add-location'])

const household = useHouseholdStore()
// Local, mutable copies - props are readonly and we need to update quantity
// per row as the user taps without touching the parent's data.
const rows = ref(props.stock.stocks.map((entry) => ({ ...entry })))
const errorMessage = ref('')
// One threshold per product (not per location) - shown once here rather
// than repeated per row.
const minQuantity = ref(props.stock.product.min_quantity ?? '')
let closeTimeoutId = null

function currentState() {
  return rows.value.map((row) => ({ locationId: row.location.id, quantity: row.quantity }))
}

// Gives the user a brief glimpse of the updated count before the sheet
// closes and the camera takes back over - a rapid second tap (on the same
// row or another one) just pushes the auto-close out further.
function scheduleClose() {
  clearTimeout(closeTimeoutId)
  // Reports every row's settled quantity so callers outside the scan flow
  // (e.g. the Bestand search view) can update their own list without a reload.
  closeTimeoutId = setTimeout(() => emit('close', currentState()), 450)
}

async function adjust(row, delta) {
  clearTimeout(closeTimeoutId)
  const previousQuantity = row.quantity
  row.quantity = Math.max(0, row.quantity + delta)
  errorMessage.value = ''

  try {
    await household.adjustStock({ ean: props.stock.ean, locationId: row.location.id, delta })
  } catch {
    row.quantity = previousQuantity
    errorMessage.value = 'Konnte nicht gespeichert werden.'
    return
  }

  scheduleClose()
}

async function saveMinQuantity() {
  const value = minQuantity.value === '' ? null : Number(minQuantity.value)
  try {
    await household.updateProductMinQuantity(props.stock.ean, value)
  } catch {
    errorMessage.value = 'Mindestbestand konnte nicht gespeichert werden.'
  }
}

// A product can be stocked at more than one location - this hands off to
// the location-picker (Fall B) instead of closing, excluding spots it's
// already at (i.e. every row already shown here).
function onAddLocation() {
  clearTimeout(closeTimeoutId)
  emit('add-location', {
    ean: props.stock.ean,
    product: props.stock.product,
    excludedLocationIds: rows.value.map((row) => row.location.id),
  })
}

onBeforeUnmount(() => clearTimeout(closeTimeoutId))
</script>

<template>
  <BottomSheet @close="emit('close', currentState())">
    <div class="flex flex-col items-center gap-4 text-center">
      <ProductAvatar :name="stock.product.name" :image-url="stock.product.image_url" :size="64" />
      <p class="text-xl font-semibold">{{ stock.product.name }}</p>

      <div class="flex max-h-[55vh] w-full flex-col gap-4 overflow-y-auto">
        <div v-for="row in rows" :key="row.location.id" class="flex flex-col gap-2">
          <p class="text-sm text-slate-400">{{ row.location.icon }} {{ row.location.name }}</p>
          <div class="flex w-full items-center justify-between gap-4">
            <button
              type="button"
              class="flex h-16 flex-1 items-center justify-center rounded-2xl bg-slate-800 text-3xl font-bold transition active:scale-95 active:bg-slate-700"
              @click="adjust(row, -1)"
            >
              −
            </button>
            <span class="w-14 text-3xl font-bold tabular-nums">{{ row.quantity }}</span>
            <button
              type="button"
              class="flex h-16 flex-1 items-center justify-center rounded-2xl bg-emerald-500 text-3xl font-bold text-slate-950 transition active:scale-95"
              @click="adjust(row, 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>

      <div class="flex items-center gap-2 text-sm text-slate-400">
        <span>Mindestbestand</span>
        <input
          v-model.number="minQuantity"
          type="number"
          min="0"
          inputmode="numeric"
          placeholder="—"
          class="w-16 rounded-lg bg-slate-800 px-2 py-1 text-center text-slate-100 outline-none focus:border focus:border-emerald-500"
          @change="saveMinQuantity"
        />
      </div>

      <button type="button" class="text-sm text-emerald-400" @click="onAddLocation">+ Weiteren Lagerort</button>
    </div>
  </BottomSheet>
</template>
