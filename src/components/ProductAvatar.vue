<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  imageUrl: { type: String, default: null },
  size: { type: Number, default: 56 },
})

// A small fixed palette that reads well on dark backgrounds, picked
// deterministically from the product name - the same product always gets
// the same color without us having to store one.
const PALETTE = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6']

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const initial = computed(() => (props.name?.trim()?.[0] ?? '?').toUpperCase())
const backgroundColor = computed(() => PALETTE[hashString(props.name ?? '') % PALETTE.length])
</script>

<template>
  <img
    v-if="imageUrl"
    :src="imageUrl"
    :alt="name"
    class="rounded-full object-cover"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
  <div
    v-else
    class="flex shrink-0 items-center justify-center rounded-full font-semibold text-slate-950"
    :style="{ width: `${size}px`, height: `${size}px`, backgroundColor, fontSize: `${size * 0.4}px` }"
  >
    {{ initial }}
  </div>
</template>
