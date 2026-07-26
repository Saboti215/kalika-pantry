<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useHouseholdStore } from '../stores/household'

const router = useRouter()
const auth = useAuthStore()
const household = useHouseholdStore()

const members = ref([])
const newLocationName = ref('')
const newLocationIcon = ref('')
const editingLocationId = ref(null)
const editingName = ref('')
const editingIcon = ref('')
const copyFeedback = ref('')

async function refreshMembers() {
  if (!household.currentHouseholdId) return
  members.value = await household.fetchMembers(household.currentHouseholdId)
}

onMounted(refreshMembers)
watch(() => household.currentHouseholdId, refreshMembers)

async function onSwitchHousehold(event) {
  await household.selectHousehold(event.target.value)
  await refreshMembers()
}

async function shareInviteCode() {
  const code = household.currentHousehold?.inviteCode
  if (!code) return

  const text = `Tritt unserem Haushalt "${household.currentHousehold.name}" in Kalika Pantry bei! Einladungscode: ${code}`

  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch {
      // User cancelled the share sheet - fall through to clipboard copy.
    }
  }

  await navigator.clipboard.writeText(code)
  copyFeedback.value = 'Kopiert!'
  setTimeout(() => (copyFeedback.value = ''), 1500)
}

async function addLocation() {
  const name = newLocationName.value.trim()
  if (!name) return

  await household.createLocation({ name, icon: newLocationIcon.value.trim() || null })
  newLocationName.value = ''
  newLocationIcon.value = ''
}

function startEditingLocation(location) {
  editingLocationId.value = location.id
  editingName.value = location.name
  editingIcon.value = location.icon ?? ''
}

async function saveLocation() {
  await household.updateLocation(editingLocationId.value, {
    name: editingName.value.trim(),
    icon: editingIcon.value.trim() || null,
  })
  editingLocationId.value = null
}

async function onSignOut() {
  await auth.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="safe-area-view min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto flex max-w-sm flex-col gap-8">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Einstellungen</h1>
        <router-link :to="{ name: 'scan' }" class="text-sm text-emerald-400">Zum Scanner</router-link>
      </header>

      <!-- Household switcher -->
      <section v-if="household.memberships.length > 1" class="space-y-2">
        <h2 class="text-sm font-medium text-slate-400">Haushalt</h2>
        <select
          :value="household.currentHouseholdId"
          class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg"
          @change="onSwitchHousehold"
        >
          <option v-for="m in household.memberships" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </section>

      <!-- Invite code -->
      <section class="space-y-2">
        <h2 class="text-sm font-medium text-slate-400">{{ household.currentHousehold?.name }}</h2>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-4"
          @click="shareInviteCode"
        >
          <span class="font-mono text-lg tracking-widest">{{ household.currentHousehold?.inviteCode }}</span>
          <span class="text-sm text-emerald-400">{{ copyFeedback || 'Teilen' }}</span>
        </button>
      </section>

      <!-- Members -->
      <section class="space-y-2">
        <h2 class="text-sm font-medium text-slate-400">Mitglieder</h2>
        <ul class="divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900">
          <li v-for="member in members" :key="member.user_id" class="flex items-center justify-between px-4 py-3">
            <span class="truncate">{{ member.email }}</span>
            <span class="text-xs text-slate-500">{{ member.role === 'owner' ? 'Besitzer' : 'Mitglied' }}</span>
          </li>
        </ul>
      </section>

      <!-- Locations -->
      <section class="space-y-2">
        <h2 class="text-sm font-medium text-slate-400">Lagerorte</h2>
        <ul class="divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900">
          <li v-for="location in household.locations" :key="location.id" class="px-4 py-3">
            <div v-if="editingLocationId === location.id" class="flex gap-2">
              <input v-model="editingIcon" class="w-14 rounded-lg bg-slate-800 px-2 py-2 text-center" placeholder="🥫" />
              <input v-model="editingName" class="flex-1 rounded-lg bg-slate-800 px-3 py-2" />
              <button type="button" class="rounded-lg bg-emerald-500 px-3 py-2 text-slate-950" @click="saveLocation">
                Sichern
              </button>
            </div>
            <button v-else type="button" class="flex w-full items-center gap-3 text-left" @click="startEditingLocation(location)">
              <span class="text-xl">{{ location.icon || '📦' }}</span>
              <span>{{ location.name }}</span>
            </button>
          </li>
        </ul>

        <form class="flex gap-2" @submit.prevent="addLocation">
          <input v-model="newLocationIcon" class="w-14 rounded-lg border border-slate-700 bg-slate-900 px-2 py-3 text-center" placeholder="🧺" />
          <input v-model="newLocationName" class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3" placeholder="Neuer Lagerort" />
          <button type="submit" class="rounded-lg bg-slate-800 px-4 py-3 text-sm">+</button>
        </form>
      </section>

      <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 text-center text-red-400" @click="onSignOut">
        Abmelden
      </button>
    </div>
  </div>
</template>
