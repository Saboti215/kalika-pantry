<script setup>
import { ref } from 'vue'
import Scanner from '../components/Scanner.vue'
import KnownStockSheet from '../components/sheets/KnownStockSheet.vue'
import AssignLocationSheet from '../components/sheets/AssignLocationSheet.vue'
import ManualEntrySheet from '../components/sheets/ManualEntrySheet.vue'
import ManualBarcodeEntrySheet from '../components/sheets/ManualBarcodeEntrySheet.vue'
import { useHouseholdStore } from '../stores/household'

const household = useHouseholdStore()

const scannerRef = ref(null)
const isLookingUp = ref(false)
const activeCase = ref(null) // 'A' | 'B' | 'C' | null
const lookupResult = ref(null)
const showManualBarcodeEntry = ref(false)

async function onDecoded(ean) {
  isLookingUp.value = true
  try {
    lookupResult.value = await household.lookupProduct(ean)
    activeCase.value = lookupResult.value.case
  } finally {
    isLookingUp.value = false
  }
}

// Closes whichever sheet is open and hands the camera back control - called
// after a completed action (Fall A tap, Fall B tile tap) or an explicit
// dismiss, always resuming the paused scanner.
function closeSheet() {
  activeCase.value = null
  lookupResult.value = null
  scannerRef.value?.resume()
}

// Fall C hands off straight into the Fall B location grid once a name has
// been typed in, without waiting for another camera scan.
function onManualNameSubmitted(product) {
  lookupResult.value = { case: 'B', product }
  activeCase.value = 'B'
}

// A product can be stocked at more than one location - jumps from Fall A
// straight into the Fall B grid, excluding locations it's already at
// (the sheet already knows which ones those are, no extra fetch needed).
function onAddLocation({ product, excludedLocationIds }) {
  lookupResult.value = { case: 'B', product, excludedLocationIds }
  activeCase.value = 'B'
}

// Fallback for when the camera can't read a barcode at all - pauses the
// scanner so it doesn't also decode something while the sheet is open.
function openManualBarcodeEntry() {
  scannerRef.value?.pause()
  showManualBarcodeEntry.value = true
}

async function onManualBarcodeSubmitted(ean) {
  showManualBarcodeEntry.value = false
  await onDecoded(ean) // same cascade a camera scan would go through
}

function onManualBarcodeCancelled() {
  showManualBarcodeEntry.value = false
  scannerRef.value?.resume()
}
</script>

<template>
  <div class="relative h-[100svh] w-full bg-black">
    <Scanner ref="scannerRef" @decoded="onDecoded" />

    <router-link
      :to="{ name: 'stock' }"
      class="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur"
    >
      🔍
    </router-link>

    <router-link
      :to="{ name: 'settings' }"
      class="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur"
    >
      ⚙️
    </router-link>

    <div v-if="isLookingUp" class="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex justify-center">
      <div class="rounded-full bg-black/60 px-4 py-2 text-sm text-white">Suche…</div>
    </div>

    <button
      type="button"
      class="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-white/70"
      @click="openManualBarcodeEntry"
    >
      Barcode manuell eingeben
    </button>

    <KnownStockSheet
      v-if="activeCase === 'A'"
      :stock="lookupResult"
      @close="closeSheet"
      @add-location="onAddLocation"
    />
    <AssignLocationSheet
      v-else-if="activeCase === 'B'"
      :product="lookupResult.product"
      :excluded-location-ids="lookupResult.excludedLocationIds || []"
      @close="closeSheet"
    />
    <ManualEntrySheet
      v-else-if="activeCase === 'C'"
      :ean="lookupResult.ean"
      @submitted="onManualNameSubmitted"
      @close="closeSheet"
    />

    <ManualBarcodeEntrySheet
      v-if="showManualBarcodeEntry"
      @submitted="onManualBarcodeSubmitted"
      @close="onManualBarcodeCancelled"
    />
  </div>
</template>
