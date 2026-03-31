import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'
import type { MealCatalogItem } from '@/types/database'
import { SEED_MEALS } from '@/data/seedMeals'

export const useFollowingStore = defineStore('following', () => {
  const customItems = ref<MealCatalogItem[]>([])
  const effortFilter = ref<'all' | 'low' | 'medium' | 'high' | 'onepot'>('all')
  const proteinFilter = ref<'all' | 'high' | 'medium' | 'low'>('all')
  const fridgeInput = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const items = computed<MealCatalogItem[]>(() => [...SEED_MEALS, ...customItems.value])

  const fridgeTokens = computed(() =>
    fridgeInput.value
      .toLowerCase()
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  )

  function matchScore(meal: MealCatalogItem): number {
    if (!fridgeTokens.value.length) return 0
    let matched = 0
    for (const ing of meal.key_ingredients) {
      const ingLower = ing.toLowerCase()
      if (fridgeTokens.value.some(t => ingLower.includes(t) || t.includes(ingLower.split(' ')[0])))
        matched++
    }
    return matched / meal.key_ingredients.length
  }

  function matchedIngredients(meal: MealCatalogItem): string[] {
    if (!fridgeTokens.value.length) return []
    return meal.key_ingredients.filter(ing => {
      const ingLower = ing.toLowerCase()
      return fridgeTokens.value.some(t => ingLower.includes(t) || t.includes(ingLower.split(' ')[0]))
    })
  }

  const scoredItems = computed(() =>
    items.value.map(item => ({
      ...item,
      score: matchScore(item),
      matched: matchedIngredients(item),
    }))
  )

  const filteredItems = computed(() => {
    let result = scoredItems.value

    if (effortFilter.value !== 'all')
      result = result.filter(i => i.category === effortFilter.value)

    if (proteinFilter.value !== 'all')
      result = result.filter(i => i.protein === proteinFilter.value)

    if (fridgeTokens.value.length) {
      result = [...result].sort((a, b) => b.score - a.score)
    }

    return result
  })

  async function fetchCustomItems() {
    const householdId = useHouseholdStore().householdId
    if (!householdId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('meal_catalog')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at')
      if (fetchError) throw fetchError
      customItems.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to fetch recipes'
    } finally {
      loading.value = false
    }
  }

  async function addItem(payload: {
    name: string
    category: MealCatalogItem['category']
    protein: MealCatalogItem['protein']
    cook_time: string
    emoji: string
    description: string | null
    key_ingredients: string[]
    tags: string[]
    household_id: string
  }) {
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('meal_catalog')
        .insert({
          ...payload,
          created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        })
        .select()
        .single()
      if (insertError) throw insertError
      if (!customItems.value.some(i => i.id === data.id)) customItems.value.push(data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to add recipe'
      throw e
    }
  }

  async function updateItem(
    id: string,
    payload: Partial<Pick<MealCatalogItem, 'name' | 'category' | 'protein' | 'cook_time' | 'emoji' | 'description' | 'key_ingredients' | 'tags'>>
  ) {
    error.value = null
    const idx = customItems.value.findIndex(i => i.id === id)
    if (idx !== -1) customItems.value[idx] = { ...customItems.value[idx], ...payload }
    try {
      const { error: updateError } = await supabase
        .from('meal_catalog')
        .update(payload)
        .eq('id', id)
      if (updateError) throw updateError
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to update recipe'
      throw e
    }
  }

  async function deleteItem(id: string) {
    error.value = null
    const idx = customItems.value.findIndex(i => i.id === id)
    if (idx !== -1) customItems.value.splice(idx, 1)
    try {
      const { error: deleteError } = await supabase
        .from('meal_catalog')
        .delete()
        .eq('id', id)
      if (deleteError) throw deleteError
    } catch (e) {
      error.value = e instanceof Error ? e.message : (e as any)?.message ?? 'Failed to delete recipe'
    }
  }

  return {
    customItems,
    items,
    effortFilter,
    proteinFilter,
    fridgeInput,
    fridgeTokens,
    filteredItems,
    loading,
    error,
    fetchCustomItems,
    addItem,
    updateItem,
    deleteItem,
  }
})
