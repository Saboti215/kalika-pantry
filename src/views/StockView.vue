<script setup>
import { ref, computed, onMounted } from 'vue'
import { useHouseholdStore } from '../stores/household'
import KnownStockSheet from '../components/sheets/KnownStockSheet.vue'
import AssignLocationSheet from '../components/sheets/AssignLocationSheet.vue'
import ProductAvatar from '../components/ProductAvatar.vue'

const household = useHouseholdStore()

const stockRows = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedLocationId = ref(null) // null = "Alle" (no location filter)
const sortBy = ref('recent') // 'recent' | 'name' | 'quantity'
const activeStock = ref(null) // row currently open in the adjust sheet, or null
const activeAssignment = ref(null) // { product, excludedLocationIds } while adding another location, or null

async function loadStock() {
  stockRows.value = await household.fetchStockOverview()
}

onMounted(async () => {
  await loadStock()
  isLoading.value = false
})

const hasActiveFilter = computed(() => searchQuery.value.trim() !== '' || selectedLocationId.value !== null)

// A product can sit at several locations - the "bald leer" warning compares
// against the total across all of them, not any single row, so splitting
// stock across locations doesn't falsely look like running low everywhere.
const totalQuantityByEan = computed(() => {
  const totals = new Map()
  for (const row of stockRows.value) {
    totals.set(row.product_ean, (totals.get(row.product_ean) ?? 0) + row.quantity)
  }
  return totals
})

function isBelowMinimum(row) {
  const min = row.products?.min_quantity
  if (min == null) return false
  return (totalQuantityByEan.value.get(row.product_ean) ?? 0) < min
}

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = stockRows.value.filter((row) => {
    // Rows with quantity 0 stay in the database (so the location is
    // remembered for the next scan) but are just noise here - only
    // currently-in-stock items are worth showing in a "what do I have" search.
    if (row.quantity <= 0) return false
    const matchesLocation = !selectedLocationId.value || row.locations?.id === selectedLocationId.value
    const matchesQuery =
      !query || row.products?.name?.toLowerCase().includes(query) || row.product_ean?.includes(query)
    return matchesLocation && matchesQuery
  })

  if (sortBy.value === 'name') {
    return [...filtered].sort((a, b) => a.products.name.localeCompare(b.products.name, 'de'))
  }
  if (sortBy.value === 'quantity') {
    return [...filtered].sort((a, b) => b.quantity - a.quantity)
  }
  return filtered // 'recent' - already ordered by updated_at desc from the fetch
})

function openStock(row) {
  activeStock.value = {
    ean: row.product_ean,
    product: row.products,
    stocks: [{ location: row.locations, quantity: row.quantity }],
  }
}

// KnownStockSheet reports back every row's settled quantity when it closes,
// so the list behind it reflects any +1/-1 taps without a full reload. A row
// that isn't found yet (just created via onAssigned below) is inserted
// instead of silently ignored.
function onSheetClose(updatedRows) {
  if (Array.isArray(updatedRows) && activeStock.value) {
    const ean = activeStock.value.ean
    for (const { locationId, quantity } of updatedRows) {
      const row = stockRows.value.find((r) => r.product_ean === ean && r.locations?.id === locationId)
      if (row) {
        row.quantity = quantity
        continue
      }
      const location = activeStock.value.stocks.find((s) => s.location.id === locationId)?.location
      if (location) {
        stockRows.value = [
          { product_ean: ean, quantity, products: activeStock.value.product, locations: location },
          ...stockRows.value,
        ]
      }
    }
  }
  activeStock.value = null
}

// A product can be stocked at more than one location - jumps from the
// adjust sheet straight into the location grid, excluding spots it's
// already at (the sheet already knows which ones those are).
function onAddLocation({ product, excludedLocationIds }) {
  activeStock.value = null
  activeAssignment.value = { product, excludedLocationIds }
}

// Fall B just created a fresh stock row at quantity 1 - hand off into the
// same +/- adjuster instead of closing immediately, so a bulk purchase can
// be reflected right away without a second scan. onSheetClose (above) adds
// the new row to the list once this sheet closes.
function onAssigned({ ean, product, location, quantity }) {
  activeAssignment.value = null
  activeStock.value = { ean, product, stocks: [{ location, quantity }] }
}
</script>

<template>
  <div class="safe-area-view min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto flex max-w-sm flex-col gap-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Bestand</h1>
        <router-link :to="{ name: 'scan' }" class="text-sm text-emerald-400">Zum Scanner</router-link>
      </header>

      <div class="flex gap-2">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Name oder Barcode…"
          class="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg outline-none focus:border-emerald-500"
        />
        <select
          v-model="sortBy"
          class="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"
        >
          <option value="recent">Neu</option>
          <option value="name">Name</option>
          <option value="quantity">Menge</option>
        </select>
      </div>

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
      <p v-else-if="filteredRows.length === 0 && hasActiveFilter" class="text-center text-slate-400">
        Keine Treffer.
      </p>
      <p v-else-if="filteredRows.length === 0" class="text-center text-slate-400">Gerade nichts vorrätig.</p>

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
            <span v-if="isBelowMinimum(row)" class="shrink-0 text-xs text-amber-400">⚠️ bald leer</span>
            <span class="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold tabular-nums">
              {{ row.quantity }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <KnownStockSheet
      v-if="activeStock"
      :stock="activeStock"
      @close="onSheetClose"
      @add-location="onAddLocation"
    />
    <AssignLocationSheet
      v-if="activeAssignment"
      :product="activeAssignment.product"
      :excluded-location-ids="activeAssignment.excludedLocationIds"
      @close="activeAssignment = null"
      @assigned="onAssigned"
    />
  </div>
</template>
