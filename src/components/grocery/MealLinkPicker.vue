<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    data-testid="backdrop"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">Link to Meals</h2>
        <button
          data-testid="close-btn"
          class="text-gray-500 hover:text-gray-700 text-xl leading-none"
          @click="$emit('close')"
        >
          &times;
        </button>
      </div>

      <!-- Body -->
      <div class="overflow-y-auto flex-1 p-4">
        <p v-if="!hasMeals" class="text-gray-500 text-center py-4">No meals available</p>

        <template v-for="(dateMeals, date) in mealsByDate" :key="date">
          <div class="mb-4">
            <h3
              data-testid="date-heading"
              class="text-sm font-medium text-gray-600 mb-2"
            >
              {{ formatDate(date as string) }}
            </h3>
            <div
              v-for="meal in dateMeals"
              :key="meal.id"
              class="flex items-center gap-2 py-1"
            >
              <input
                :id="`meal-picker-${meal.id}`"
                type="checkbox"
                :checked="modelValue.includes(meal.id)"
                class="w-4 h-4 cursor-pointer"
                @change="toggleMeal(meal.id)"
              />
              <label :for="`meal-picker-${meal.id}`" class="cursor-pointer flex-1">
                {{ meal.title }}
                <span v-if="meal.meal_type" class="text-xs text-gray-500 ml-1">
                  ({{ meal.meal_type }})
                </span>
              </label>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t">
        <button
          data-testid="done-btn"
          class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          @click="$emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMealsStore } from '@/stores/meals'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'close': []
}>()

const mealsStore = useMealsStore()

const mealsByDate = computed(() => mealsStore.mealsByDate)
const hasMeals = computed(() => mealsStore.meals.length > 0)

function toggleMeal(mealId: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(mealId)
  if (idx !== -1) {
    current.splice(idx, 1)
  } else {
    current.push(mealId)
  }
  emit('update:modelValue', current)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>
