import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'
import type { GrocerySection, GroceryItem } from '@/types/database'
import { useEditNotification } from '@/composables/useEditNotification'

const recentOwnIds = new Set<string>()
function trackOwnChange(id: string) {
  recentOwnIds.add(id)
  setTimeout(() => recentOwnIds.delete(id), 2000)
}

export const useGroceryStore = defineStore('grocery', () => {
  // Internal — never exposed publicly
  const _sections = ref<GrocerySection[]>([])

  const items = ref<GroceryItem[]>([])
  const itemLinks = ref<Array<{ grocery_item_id: string; meal_id: string; meals: { id: string; title: string } }>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const itemMealLinks = computed(() => {
    const map: Record<string, Array<{ id: string; title: string }>> = {}
    for (const link of itemLinks.value) {
      if (!map[link.grocery_item_id]) map[link.grocery_item_id] = []
      map[link.grocery_item_id].push({ id: link.meals.id, title: link.meals.title })
    }
    return map
  })

  const mealGroceryCounts = computed(() => {
    const map: Record<string, number> = {}
    for (const link of itemLinks.value) {
      map[link.meal_id] = (map[link.meal_id] || 0) + 1
    }
    return map
  })

  const mealItemIds = computed(() => {
    const map: Record<string, string[]> = {}
    for (const link of itemLinks.value) {
      if (!map[link.meal_id]) map[link.meal_id] = []
      map[link.meal_id].push(link.grocery_item_id)
    }
    return map
  })

  const storeNames = computed(() => {
    const names = new Set<string>()
    for (const item of items.value) {
      if (item.store) names.add(item.store)
    }
    return [...names].sort()
  })

  let itemsChannel: ReturnType<typeof supabase.channel> | null = null
  let linksChannel: ReturnType<typeof supabase.channel> | null = null

  async function _fetchSections() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    const { data } = await supabase
      .from('grocery_sections')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
    _sections.value = data ?? []
  }

  async function _ensureUngroupedSection() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    if (_sections.value.length === 0) await _fetchSections()
    if (_sections.value.some(s => s.name === 'Ungrouped')) return
    const { data, error: insertError } = await supabase
      .from('grocery_sections')
      .insert({ household_id: householdId, name: 'Ungrouped', sort_order: -1, is_default: false })
      .select()
      .single()
    if (!insertError && data) _sections.value.unshift(data)
  }

  async function fetchItems() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('household_id', householdId)
        .order('sort_order')
      if (fetchError) throw fetchError
      items.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to fetch items'
    } finally {
      loading.value = false
    }
  }

  async function fetchItemMealLinks() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    if (items.value.length === 0) {
      itemLinks.value = []
      return
    }

    try {
      const itemIds = items.value.map(i => i.id)
      const { data, error: fetchError } = await supabase
        .from('grocery_item_meals')
        .select('grocery_item_id, meal_id, meals(id, title)')
        .in('grocery_item_id', itemIds)
      if (fetchError) throw fetchError
      itemLinks.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to fetch meal links'
    }
  }

  async function addItem(payload: {
    name: string
    quantity?: string | null
    store?: string | null
    household_id: string
  }) {
    error.value = null
    await _ensureUngroupedSection()
    const section = _sections.value.find(s => s.name === 'Ungrouped')
    if (!section) return
    const nextOrder = items.value.length
    try {
      const { data, error: insertError } = await supabase
        .from('grocery_items')
        .insert({ ...payload, store: payload.store ?? null, section_id: section.id, is_checked: false, sort_order: nextOrder })
        .select()
        .single()
      if (insertError) throw insertError
      trackOwnChange(data.id)
      // Guard against duplicate: realtime INSERT event may have already added this item
      if (!items.value.some(i => i.id === data.id)) items.value.push(data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to add item'
    }
  }

  async function updateItem(
    id: string,
    payload: Partial<Pick<GroceryItem, 'name' | 'quantity' | 'store' | 'section_id' | 'is_checked'>>
  ) {
    error.value = null
    trackOwnChange(id)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], ...payload }
    try {
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update(payload)
        .eq('id', id)
      if (updateError) throw updateError
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to update item'
    }
  }

  async function deleteItem(id: string) {
    error.value = null
    trackOwnChange(id)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value.splice(idx, 1)
    try {
      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', id)
      if (deleteError) throw deleteError
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to delete item'
    }
  }

  async function toggleChecked(id: string) {
    const item = items.value.find(i => i.id === id)
    if (!item) return
    await updateItem(id, { is_checked: !item.is_checked })
  }

  async function clearChecked() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    error.value = null
    items.value.filter(i => i.is_checked).forEach(i => trackOwnChange(i.id))
    items.value = items.value.filter(i => !i.is_checked)
    try {
      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .eq('household_id', householdId)
        .eq('is_checked', true)
      if (deleteError) throw deleteError
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to clear checked items'
      await fetchItems()
    }
  }

  async function linkItemToMeals(itemId: string, mealIds: string[]) {
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('grocery_item_meals')
        .delete()
        .eq('grocery_item_id', itemId)
      if (deleteError) throw deleteError

      if (mealIds.length > 0) {
        const { error: insertError } = await supabase
          .from('grocery_item_meals')
          .insert(mealIds.map(meal_id => ({ grocery_item_id: itemId, meal_id })))
        if (insertError) throw insertError
      }
      await fetchItemMealLinks()
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to link item to meals'
    }
  }

  async function linkMealToItems(mealId: string, itemIds: string[]) {
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('grocery_item_meals')
        .delete()
        .eq('meal_id', mealId)
      if (deleteError) throw deleteError

      if (itemIds.length > 0) {
        const { error: insertError } = await supabase
          .from('grocery_item_meals')
          .insert(itemIds.map(grocery_item_id => ({ grocery_item_id, meal_id: mealId })))
        if (insertError) throw insertError
      }
      await fetchItemMealLinks()
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to link meal to items'
    }
  }

  function subscribeRealtime() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return

    itemsChannel = supabase
      .channel('grocery-items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_items', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const { notify } = useEditNotification()
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as GroceryItem
            if (!recentOwnIds.has(incoming.id)) notify('Grocery list was updated')
            const exists = items.value.some(i => i.id === incoming.id)
            if (!exists) items.value.push(incoming)
          } else if (payload.eventType === 'UPDATE') {
            const incoming = payload.new as GroceryItem
            if (!recentOwnIds.has(incoming.id)) notify('Grocery list was updated')
            const idx = items.value.findIndex(i => i.id === incoming.id)
            if (idx !== -1) items.value[idx] = incoming
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as GroceryItem).id
            if (!recentOwnIds.has(deletedId)) notify('Grocery list was updated')
            const idx = items.value.findIndex(i => i.id === deletedId)
            if (idx !== -1) items.value.splice(idx, 1)
          }
        }
      )
      .subscribe()

    linksChannel = supabase
      .channel('grocery-item-meals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_item_meals' },
        () => { fetchItemMealLinks() }
      )
      .subscribe()
  }

  async function unsubscribeRealtime() {
    if (itemsChannel) {
      await supabase.removeChannel(itemsChannel)
      itemsChannel = null
    }
    if (linksChannel) {
      await supabase.removeChannel(linksChannel)
      linksChannel = null
    }
  }

  return {
    items,
    itemMealLinks,
    mealGroceryCounts,
    mealItemIds,
    storeNames,
    loading,
    error,
    fetchItems,
    fetchItemMealLinks,
    addItem,
    updateItem,
    deleteItem,
    toggleChecked,
    clearChecked,
    linkItemToMeals,
    linkMealToItems,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
