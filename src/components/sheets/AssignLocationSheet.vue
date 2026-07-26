<script setup>
import { ref } from 'vue'
import { useHouseholdStore } from '../../stores/household'
import BottomSheet from './BottomSheet.vue'
import ProductAvatar from '../ProductAvatar.vue'
import LocationTile from '../LocationTile.vue'

// Fall B: the product is known (from our DB, Open Food Facts, or a manual
// name just typed in), but it isn't assigned to a location yet - the
// 1-click flow. Tapping a tile creates the product (if needed) and its
// first stock row with quantity 1.
const props = defineProps({
  product: { type: Object, required: true }, // { ean, name, image_url }
})
const emit = defineEmits(['close'])

const household = useHouseholdStore()
const isAssigning = ref(false)
const errorMessage = ref('')

async function onSelectLocation(locationId) {
  if (isAssigning.value) return
  isAssigning.value = true
  errorMessage.value = ''

  try {
    await household.assignLocation(props.product, locationId)
    emit('close')
  } catch {
    errorMessage.value = 'Konnte nicht gespeichert werden.'
  } finally {
    isAssigning.value = false
  }
}
</script>

<template>
  <BottomSheet @close="emit('close')">
    <div class="flex flex-col items-center gap-4">
      <ProductAvatar :name="product.name" :image-url="product.image_url" :size="64" />
      <p class="text-lg font-semibold">{{ product.name }}</p>
      <p class="text-sm text-slate-400">Wohin damit?</p>

      <div class="grid w-full grid-cols-2 gap-3" :class="{ 'pointer-events-none opacity-60': isAssigning }">
        <LocationTile
          v-for="location in household.locations"
          :key="location.id"
          :name="location.name"
          :icon="location.icon"
          @select="onSelectLocation(location.id)"
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>
    </div>
  </BottomSheet>
</template>
