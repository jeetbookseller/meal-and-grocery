import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Meal } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'

export const useMealsStore = defineStore('meals', () => {
  let channel: RealtimeChannel | null = null
  const meals = ref<Meal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedRange = ref<{ start: string; end: string }>({ start: '', end: '' })

  const mealsByDate = computed(() => {
    const map: Record<string, Meal[]> = {}
    for (const meal of meals.value) {
      if (!map[meal.date]) map[meal.date] = []
      map[meal.date].push(meal)
    }
    for (const date in map) {
      map[date].sort((a, b) => a.sort_order - b.sort_order)
    }
    return map
  })

  async function fetchMeals() {
    const householdStore = useHouseholdStore()
    if (!householdStore.householdId || !selectedRange.value.start) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('meals')
        .select('*')
        .eq('household_id', householdStore.householdId)
        .gte('date', selectedRange.value.start)
        .lte('date', selectedRange.value.end)
        .order('date')
        .order('sort_order')

      if (fetchError) throw new Error(fetchError.message)

      meals.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch meals'
    } finally {
      loading.value = false
    }
  }

  function setRange(start: string, end: string) {
    selectedRange.value = { start, end }
    return fetchMeals()
  }

  async function addMeal(payload: Omit<Meal, 'id' | 'created_at' | 'updated_at'>) {
    const tempId = `temp-${Date.now()}`
    const tempMeal: Meal = { ...payload, id: tempId, created_at: '', updated_at: '' }
    meals.value.push(tempMeal)

    try {
      const { data, error: insertError } = await supabase
        .from('meals')
        .insert(payload)
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      const idx = meals.value.findIndex((m) => m.id === tempId)
      if (idx !== -1) meals.value.splice(idx, 1, data)
    } catch (e) {
      meals.value = meals.value.filter((m) => m.id !== tempId)
      error.value = e instanceof Error ? e.message : 'Failed to add meal'
    }
  }

  async function updateMeal(id: string, payload: Partial<Omit<Meal, 'id' | 'created_at' | 'updated_at'>>) {
    const idx = meals.value.findIndex((m) => m.id === id)
    if (idx === -1) return

    const original = { ...meals.value[idx] }
    meals.value.splice(idx, 1, { ...original, ...payload })

    try {
      const { data, error: updateError } = await supabase
        .from('meals')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)

      const newIdx = meals.value.findIndex((m) => m.id === id)
      if (newIdx !== -1) meals.value.splice(newIdx, 1, data)
    } catch (e) {
      const newIdx = meals.value.findIndex((m) => m.id === id)
      if (newIdx !== -1) meals.value.splice(newIdx, 1, original)
      error.value = e instanceof Error ? e.message : 'Failed to update meal'
    }
  }

  async function deleteMeal(id: string) {
    const idx = meals.value.findIndex((m) => m.id === id)
    if (idx === -1) return

    const removed = meals.value.splice(idx, 1)[0]

    try {
      const { error: deleteError } = await supabase.from('meals').delete().eq('id', id)

      if (deleteError) throw new Error(deleteError.message)
    } catch (e) {
      meals.value.splice(idx, 0, removed)
      error.value = e instanceof Error ? e.message : 'Failed to delete meal'
    }
  }

  function subscribeRealtime() {
    const householdStore = useHouseholdStore()
    if (!householdStore.householdId) return

    channel = supabase
      .channel('meals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `household_id=eq.${householdStore.householdId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incoming = payload.new as Meal
            const idx = meals.value.findIndex((m) => m.id === incoming.id)
            if (idx !== -1) {
              meals.value.splice(idx, 1, incoming)
            } else {
              meals.value.push(incoming)
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            meals.value = meals.value.filter((m) => m.id !== deletedId)
          }
        },
      )
      .subscribe()
  }

  function unsubscribeRealtime() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  return {
    meals,
    loading,
    error,
    selectedRange,
    mealsByDate,
    fetchMeals,
    setRange,
    addMeal,
    updateMeal,
    deleteMeal,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
