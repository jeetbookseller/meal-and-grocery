import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'
import type { PantryItem } from '@/types/database'
import { useEditNotification } from '@/composables/useEditNotification'

const recentOwnIds = new Set<string>()
function trackOwnChange(id: string) {
  recentOwnIds.add(id)
  setTimeout(() => recentOwnIds.delete(id), 2000)
}

export const usePantryStore = defineStore('pantry', () => {
  const items = ref<PantryItem[]>([])
  const itemLinks = ref<Array<{ pantry_item_id: string; meal_id: string; meals: { id: string; title: string } }>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const itemMealLinks = computed(() => {
    const map: Record<string, Array<{ id: string; title: string }>> = {}
    for (const link of itemLinks.value) {
      if (!map[link.pantry_item_id]) map[link.pantry_item_id] = []
      map[link.pantry_item_id].push({ id: link.meals.id, title: link.meals.title })
    }
    return map
  })

  const mealPantryCounts = computed(() => {
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
      map[link.meal_id].push(link.pantry_item_id)
    }
    return map
  })

  let itemsChannel: ReturnType<typeof supabase.channel> | null = null
  let linksChannel: ReturnType<typeof supabase.channel> | null = null

  async function fetchItems() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('pantry_items')
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
        .from('pantry_item_meals')
        .select('pantry_item_id, meal_id, meals(id, title)')
        .in('pantry_item_id', itemIds)
      if (fetchError) throw fetchError
      itemLinks.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to fetch meal links'
    }
  }

  async function addItem(payload: {
    name: string
    quantity?: string | null
    household_id: string
  }) {
    error.value = null
    const nextOrder = items.value.length
    try {
      const { data, error: insertError } = await supabase
        .from('pantry_items')
        .insert({
          name: payload.name,
          quantity: payload.quantity ?? null,
          household_id: payload.household_id,
          is_checked: false,
          sort_order: nextOrder,
        })
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
    payload: Partial<Pick<PantryItem, 'name' | 'quantity' | 'is_checked'>>
  ) {
    error.value = null
    trackOwnChange(id)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], ...payload }
    try {
      const { error: updateError } = await supabase
        .from('pantry_items')
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
        .from('pantry_items')
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
        .from('pantry_items')
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
        .from('pantry_item_meals')
        .delete()
        .eq('pantry_item_id', itemId)
      if (deleteError) throw deleteError

      if (mealIds.length > 0) {
        const { error: insertError } = await supabase
          .from('pantry_item_meals')
          .insert(mealIds.map(meal_id => ({ pantry_item_id: itemId, meal_id })))
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
        .from('pantry_item_meals')
        .delete()
        .eq('meal_id', mealId)
      if (deleteError) throw deleteError

      if (itemIds.length > 0) {
        const { error: insertError } = await supabase
          .from('pantry_item_meals')
          .insert(itemIds.map(pantry_item_id => ({ pantry_item_id, meal_id: mealId })))
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
      .channel('pantry-items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pantry_items', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const { notify } = useEditNotification()
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as PantryItem
            if (!recentOwnIds.has(incoming.id)) notify('Pantry list was updated')
            const exists = items.value.some(i => i.id === incoming.id)
            if (!exists) items.value.push(incoming)
          } else if (payload.eventType === 'UPDATE') {
            const incoming = payload.new as PantryItem
            if (!recentOwnIds.has(incoming.id)) notify('Pantry list was updated')
            const idx = items.value.findIndex(i => i.id === incoming.id)
            if (idx !== -1) items.value[idx] = incoming
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as PantryItem).id
            if (!recentOwnIds.has(deletedId)) notify('Pantry list was updated')
            const idx = items.value.findIndex(i => i.id === deletedId)
            if (idx !== -1) items.value.splice(idx, 1)
          }
        }
      )
      .subscribe()

    linksChannel = supabase
      .channel('pantry-item-meals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pantry_item_meals' },
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
    mealPantryCounts,
    mealItemIds,
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
