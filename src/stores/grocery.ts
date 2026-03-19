import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'
import type { GrocerySection, GroceryItem } from '@/types/database'

export const useGroceryStore = defineStore('grocery', () => {
  // Internal — never exposed publicly
  const _sections = ref<GrocerySection[]>([])

  const items = ref<GroceryItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let itemsChannel: ReturnType<typeof supabase.channel> | null = null

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

  async function addItem(payload: {
    name: string
    quantity?: string | null
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
        .insert({ ...payload, section_id: section.id, is_checked: false, sort_order: nextOrder })
        .select()
        .single()
      if (insertError) throw insertError
      items.value.push(data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to add item'
    }
  }

  async function updateItem(
    id: string,
    payload: Partial<Pick<GroceryItem, 'name' | 'quantity' | 'section_id' | 'is_checked'>>
  ) {
    error.value = null
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
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to link item to meals'
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
          if (payload.eventType === 'INSERT') {
            const exists = items.value.some(i => i.id === (payload.new as GroceryItem).id)
            if (!exists) items.value.push(payload.new as GroceryItem)
          } else if (payload.eventType === 'UPDATE') {
            const idx = items.value.findIndex(i => i.id === (payload.new as GroceryItem).id)
            if (idx !== -1) items.value[idx] = payload.new as GroceryItem
          } else if (payload.eventType === 'DELETE') {
            const idx = items.value.findIndex(i => i.id === (payload.old as GroceryItem).id)
            if (idx !== -1) items.value.splice(idx, 1)
          }
        }
      )
      .subscribe()
  }

  async function unsubscribeRealtime() {
    if (itemsChannel) {
      await supabase.removeChannel(itemsChannel)
      itemsChannel = null
    }
  }

  return {
    items,
    loading,
    error,
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
    toggleChecked,
    clearChecked,
    linkItemToMeals,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
