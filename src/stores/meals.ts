import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Meal } from '@/types/database'

// Full implementation in TASK-05
export const useMealsStore = defineStore('meals', () => {
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
    return map
  })

  return { meals, loading, error, selectedRange, mealsByDate }
})
