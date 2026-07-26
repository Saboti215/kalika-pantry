const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product'

// Looks up a product by EAN/barcode in the Open Food Facts database. Returns
// null on a miss (product not found, or the request itself failing) so
// callers can fall through to manual entry without special-casing errors.
export async function lookupByEan(ean) {
  try {
    const response = await fetch(`${OPEN_FOOD_FACTS_BASE_URL}/${ean}.json`)
    if (!response.ok) return null

    const data = await response.json()
    if (data.status !== 1 || !data.product) return null

    const name = data.product.product_name || data.product.product_name_de || data.product.generic_name
    if (!name) return null

    return {
      name,
      imageUrl: data.product.image_front_small_url || data.product.image_url || null,
    }
  } catch {
    return null
  }
}
