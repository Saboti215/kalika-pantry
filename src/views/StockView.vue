<script setup>
import { ref, computed, onMounted } from 'vue'
import { useHouseholdStore } from '../stores/household'
import KnownStockSheet from '../components/sheets/KnownStockSheet.vue'
import ProductAvatar from '../components/ProductAvatar.vue'

const household = useHouseholdStore()

const stockRows = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedLocationId = ref(null) // null = "Alle" (no location filter)
const activeStock = ref(null) // row currently open in the adjust sheet, or null

onMounted(async () => {
  stockRows.value = await household.fetchStockOverview()
  isLoading.value = false
})

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return stockRows.value.filter((row) => {
    const matchesLocation = !selectedLocationId.value || row.locations?.id === selectedLocationId.value
    const matchesQuery = !query || row.products?.name?.toLowerCase().includes(query)
    return matchesLocation && matchesQuery
  })
})

function openStock(row) {
  activeStock.value = {
    ean: row.product_ean,
    product: row.products,
    location: row.locations,
    quantity: row.quantity,
  }
}

// KnownStockSheet reports back the quantity it settled on when it closes, so
// the list behind it reflects any +1/-1 taps without a full reload.
function onSheetClose(finalQuantity) {
  if (activeStock.value && typeof finalQuantity === 'number') {
    const row = stockRows.value.find(
      (r) => r.product_ean === activeStock.value.ean && r.locations?.id === activeStock.value.location.id
    )
    if (row) row.quantity = finalQuantity
  }
  activeStock.value = null
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
    <div class="mx-auto flex max-w-sm flex-col gap-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Bestand</h1>
        <router-link :to="{ name: 'scan' }" class="text-sm text-emerald-400">Zum Scanner</router-link>
      </header>

      <input
        v-model="searchQuery"
        type="search"
        placeholder="Artikel suchen…"
        class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg outline-none focus:border-emerald-500"
      />

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          class="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition"
          :class="selectedLocationId === null ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'"
          @click="selectedLocationId = null"
        >
          Alle
        </button>
        <button
          v-for="location in household.locations"
          :key="location.id"
          type="button"
          class="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition"
          :class="selectedLocationId === location.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'"
          @click="selectedLocationId = location.id"
        >
          {{ location.icon }} {{ location.name }}
        </button>
      </div>

      <p v-if="isLoading" class="text-center text-slate-400">Lädt…</p>
      <p v-else-if="stockRows.length === 0" class="text-center text-slate-400">
        Noch keine Artikel erfasst - einfach scannen!
      </p>
      <p v-else-if="filteredRows.length === 0" class="text-center text-slate-400">Keine Treffer.</p>

      <ul v-else class="flex flex-col gap-2">
        <li v-for="row in filteredRows" :key="`${row.product_ean}-${row.locations.id}`">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition active:scale-[0.99] active:bg-slate-800"
            @click="openStock(row)"
          >
            <ProductAvatar :name="row.products.name" :image-url="row.products.image_url" :size="44" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ row.products.name }}</p>
              <p v-if="selectedLocationId === null" class="truncate text-sm text-slate-400">
                {{ row.locations.icon }} {{ row.locations.name }}
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold tabular-nums">
              {{ row.quantity }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <KnownStockSheet v-if="activeStock" :stock="activeStock" @close="onSheetClose" />
  </div>
</template>
