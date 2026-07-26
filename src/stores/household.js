import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { lookupByEan } from '../lib/openFoodFacts'

const CURRENT_HOUSEHOLD_STORAGE_KEY = 'kalika-pantry:current-household-id'

export const useHouseholdStore = defineStore('household', () => {
  // All households the current user belongs to.
  const memberships = ref([])
  // The household currently in use throughout the app (scan, sheets, settings).
  const currentHouseholdId = ref(localStorage.getItem(CURRENT_HOUSEHOLD_STORAGE_KEY))
  // Locations of the current household, cached so the assign-location grid
  // never has to wait on a network round trip during a scan.
  const locations = ref([])

  const isLoaded = ref(false)
  let loadPromise = null

  const currentHousehold = computed(
    () => memberships.value.find((membership) => membership.id === currentHouseholdId.value) ?? null
  )
  const hasHousehold = computed(() => !!currentHousehold.value)

  function persistCurrentHouseholdId(id) {
    currentHouseholdId.value = id
    if (id) {
      localStorage.setItem(CURRENT_HOUSEHOLD_STORAGE_KEY, id)
    } else {
      localStorage.removeItem(CURRENT_HOUSEHOLD_STORAGE_KEY)
    }
  }

  async function loadMemberships() {
    const auth = useAuthStore()
    const { data, error } = await supabase
      .from('household_members')
      .select('role, households(id, name, invite_code)')
      .eq('user_id', auth.userId)

    if (error) throw error

    memberships.value = data.map((row) => ({
      id: row.households.id,
      name: row.households.name,
      inviteCode: row.households.invite_code,
      role: row.role,
    }))

    // Fall back to the first membership if there's no stored choice, or the
    // stored household id no longer applies (e.g. the user left it elsewhere).
    const stillValid = memberships.value.some((m) => m.id === currentHouseholdId.value)
    if (!stillValid) {
      persistCurrentHouseholdId(memberships.value[0]?.id ?? null)
    }
  }

  async function loadLocations() {
    if (!currentHouseholdId.value) {
      locations.value = []
      return
    }

    const { data, error } = await supabase
      .from('locations')
      .select('id, name, icon, sort_order')
      .eq('household_id', currentHouseholdId.value)
      .order('sort_order', { ascending: true })

    if (error) throw error
    locations.value = data
  }

  // Ensures memberships + locations are loaded exactly once per session;
  // safe to call from every router guard evaluation.
  function ensureLoaded() {
    if (loadPromise) return loadPromise

    loadPromise = loadMemberships()
      .then(() => loadLocations())
      .then(() => {
        isLoaded.value = true
      })

    return loadPromise
  }

  async function selectHousehold(householdId) {
    persistCurrentHouseholdId(householdId)
    await loadLocations()
  }

  async function createHousehold(name) {
    const { data, error } = await supabase.rpc('create_household', { household_name: name })
    if (error) throw error

    await loadMemberships()
    await selectHousehold(data.id)
    return data
  }

  async function joinHousehold(inviteCode) {
    const { data, error } = await supabase.rpc('join_household_by_code', { code: inviteCode })
    if (error) throw error

    await loadMemberships()
    await selectHousehold(data.id)
    return data
  }

  async function fetchMembers(householdId) {
    const { data, error } = await supabase.rpc('get_household_members', {
      hid: householdId ?? currentHouseholdId.value,
    })
    if (error) throw error
    return data
  }

  async function createLocation({ name, icon }) {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        household_id: currentHouseholdId.value,
        name,
        icon,
        sort_order: locations.value.length,
      })
      .select()
      .single()

    if (error) throw error
    locations.value = [...locations.value, data]
    return data
  }

  async function updateLocation(id, { name, icon }) {
    const { data, error } = await supabase
      .from('locations')
      .update({ name, icon })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    locations.value = locations.value.map((location) => (location.id === id ? data : location))
    return data
  }

  // The scan-first lookup cascade: known stock -> known product -> Open Food
  // Facts -> unknown. Returns a discriminated { case: 'A' | 'B' | 'C', ... }
  // object that ScanView uses to pick which bottom sheet to show.
  async function lookupProduct(ean) {
    const householdId = currentHouseholdId.value

    // 1. Is this product already assigned to a location in this household?
    const { data: stockRows, error: stockError } = await supabase
      .from('stock')
      .select('quantity, updated_at, locations(id, name, icon), products(ean, name, image_url)')
      .eq('household_id', householdId)
      .eq('product_ean', ean)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (stockError) throw stockError

    if (stockRows.length > 0) {
      const [row] = stockRows
      return { case: 'A', ean, product: row.products, location: row.locations, quantity: row.quantity }
    }

    // 2. Is the product itself already known in this household (no location yet)?
    const { data: knownProduct, error: productError } = await supabase
      .from('products')
      .select('ean, name, image_url')
      .eq('household_id', householdId)
      .eq('ean', ean)
      .maybeSingle()

    if (productError) throw productError
    if (knownProduct) {
      return { case: 'B', ean, product: knownProduct }
    }

    // 3. Fall back to Open Food Facts.
    const offProduct = await lookupByEan(ean)
    if (offProduct) {
      return {
        case: 'B',
        ean,
        product: { ean, name: offProduct.name, image_url: offProduct.imageUrl },
      }
    }

    // 4. Totally unknown - manual entry required.
    return { case: 'C', ean }
  }

  // Persists a product (upsert - works whether it came from our DB, Open
  // Food Facts, or manual entry) and creates its first stock row at the
  // chosen location with quantity 1. Used by the Fall B / Fall C 1-click flow.
  async function assignLocation(product, locationId) {
    const householdId = currentHouseholdId.value

    const { error: upsertError } = await supabase.from('products').upsert(
      {
        household_id: householdId,
        ean: product.ean,
        name: product.name,
        image_url: product.image_url ?? null,
      },
      { onConflict: 'household_id,ean' }
    )
    if (upsertError) throw upsertError

    const { data, error: stockError } = await supabase
      .from('stock')
      .upsert(
        { household_id: householdId, product_ean: product.ean, location_id: locationId, quantity: 1 },
        { onConflict: 'household_id,product_ean,location_id' }
      )
      .select('quantity, locations(id, name, icon)')
      .single()

    if (stockError) throw stockError
    return data
  }

  // Atomic +1/-1 (or arbitrary delta) against an existing stock row - the
  // Fall A 0-click flow. Delegates to the increment_stock RPC so concurrent
  // taps from different household members can't clobber each other.
  async function adjustStock({ ean, locationId, delta }) {
    const { data, error } = await supabase.rpc('increment_stock', {
      p_household_id: currentHouseholdId.value,
      p_ean: ean,
      p_location_id: locationId,
      p_delta: delta,
    })
    if (error) throw error
    return data
  }

  return {
    memberships,
    currentHouseholdId,
    currentHousehold,
    hasHousehold,
    locations,
    isLoaded,
    ensureLoaded,
    loadMemberships,
    loadLocations,
    selectHousehold,
    createHousehold,
    joinHousehold,
    fetchMembers,
    createLocation,
    updateLocation,
    lookupProduct,
    assignLocation,
    adjustStock,
  }
})
