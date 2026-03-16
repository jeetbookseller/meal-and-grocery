<template>
  <div class="mt-4">
    <div v-if="datesWithMeals.length === 0" class="text-center text-gray-400 py-12">
      No meals planned for this period
    </div>
    <div v-else class="space-y-6">
      <div v-for="date in datesWithMeals" :key="date">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {{ formatDate(date) }}
        </h3>
        <MealCard
          v-for="meal in mealsStore.mealsByDate[date]"
          :key="meal.id"
          :meal="meal"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMealsStore } from '@/stores/meals'
import MealCard from '@/components/MealCard.vue'

const mealsStore = useMealsStore()

const datesWithMeals = computed(() =>
  Object.keys(mealsStore.mealsByDate)
    .filter((date) => mealsStore.mealsByDate[date].length > 0)
    .sort()
)

function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
</script>
