<script setup>
import { ref } from 'vue'
import Scanner from '../components/Scanner.vue'
import KnownStockSheet from '../components/sheets/KnownStockSheet.vue'
import AssignLocationSheet from '../components/sheets/AssignLocationSheet.vue'
import ManualEntrySheet from '../components/sheets/ManualEntrySheet.vue'
import { useHouseholdStore } from '../stores/household'

const household = useHouseholdStore()

const scannerRef = ref(null)
const isLookingUp = ref(false)
const activeCase = ref(null) // 'A' | 'B' | 'C' | null
const lookupResult = ref(null)

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
</script>

<template>
  <div class="relative h-[100svh] w-full bg-black">
    <Scanner ref="scannerRef" @decoded="onDecoded" />

    <router-link
      :to="{ name: 'settings' }"
      class="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur"
    >
      ⚙️
    </router-link>

    <div v-if="isLookingUp" class="absolute inset-x-0 bottom-10 flex justify-center">
      <div class="rounded-full bg-black/60 px-4 py-2 text-sm text-white">Suche…</div>
    </div>

    <KnownStockSheet v-if="activeCase === 'A'" :stock="lookupResult" @close="closeSheet" />
    <AssignLocationSheet v-else-if="activeCase === 'B'" :product="lookupResult.product" @close="closeSheet" />
    <ManualEntrySheet
      v-else-if="activeCase === 'C'"
      :ean="lookupResult.ean"
      @submitted="onManualNameSubmitted"
      @close="closeSheet"
    />
  </div>
</template>
