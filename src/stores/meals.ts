import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Meal } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'

export const useMealsStore = defineStore('meals', () => {
  let channel: RealtimeChannel | null = null
  const meals = ref<Meal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMeals() {
    const householdStore = useHouseholdStore()
    if (!householdStore.householdId) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('meals')
        .select('*')
        .eq('household_id', householdStore.householdId)
        .order('sort_order')

      if (fetchError) throw new Error(fetchError.message)

      meals.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch meals'
    } finally {
      loading.value = false
    }
  }

  async function addMeal(payload: { title: string; household_id: string; sort_order: number; is_checked?: boolean; date?: string }) {
    const fullPayload = {
      ...payload,
      is_checked: payload.is_checked ?? false,
      date: payload.date ?? new Date().toISOString().split('T')[0],
    }
    const tempId = `temp-${Date.now()}`
    const tempMeal: Meal = {
      ...fullPayload,
      id: tempId,
      date: '',
      meal_type: null,
      notes: null,
      created_by: '',
      created_at: '',
      updated_at: '',
    }
    meals.value.push(tempMeal)

    try {
      const { data, error: insertError } = await supabase
        .from('meals')
        .insert(fullPayload)
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

  async function toggleChecked(id: string) {
    const meal = meals.value.find((m) => m.id === id)
    if (!meal) return
    await updateMeal(id, { is_checked: !meal.is_checked })
  }

  async function clearChecked() {
    const checked = meals.value.filter((m) => m.is_checked)
    if (!checked.length) return

    const ids = checked.map((m) => m.id)
    meals.value = meals.value.filter((m) => !m.is_checked)

    try {
      const { error: deleteError } = await supabase.from('meals').delete().in('id', ids)

      if (deleteError) throw new Error(deleteError.message)
    } catch (e) {
      meals.value = [...meals.value, ...checked]
      error.value = e instanceof Error ? e.message : 'Failed to clear checked meals'
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
    fetchMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    toggleChecked,
    clearChecked,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
