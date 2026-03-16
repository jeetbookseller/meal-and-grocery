<template>
  <div class="mt-4 space-y-6">
    <div v-for="date in dateRange" :key="date">
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {{ formatDate(date) }}
      </h3>
      <MealCard
        v-for="meal in mealsStore.mealsByDate[date] ?? []"
        :key="meal.id"
        :meal="meal"
      />
      <AddMealInline :date="date" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMealsStore } from '@/stores/meals'
import MealCard from '@/components/MealCard.vue'
import AddMealInline from '@/components/AddMealInline.vue'

const mealsStore = useMealsStore()

const dateRange = computed<string[]>(() => {
  const { start, end } = mealsStore.selectedRange
  if (!start || !end) return []
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  while (current <= endDate) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
})

function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
</script>
