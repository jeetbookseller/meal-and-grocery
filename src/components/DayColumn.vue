<template>
  <div class="min-w-48 flex-shrink-0">
    <h3 data-testid="day-heading" class="font-semibold text-sm mb-2 text-gray-700">
      {{ formattedDate }}
    </h3>
    <MealCard v-for="meal in meals" :key="meal.id" :meal="meal" />
    <AddMealInline :date="date" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Meal } from '@/types/database'
import MealCard from '@/components/MealCard.vue'
import AddMealInline from '@/components/AddMealInline.vue'

const props = defineProps<{
  date: string
  meals: Meal[]
}>()

const formattedDate = computed(() => {
  // Use noon local time to avoid UTC-shift issues with date-only strings
  const d = new Date(props.date + 'T12:00:00')
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  return `${weekday} ${month} ${day}`
})
</script>
