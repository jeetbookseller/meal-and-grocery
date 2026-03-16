<template>
  <div class="mt-4">
    <!-- Meal list -->
    <div v-if="mealsStore.meals.length === 0" class="text-center text-gray-400 py-8">
      No meals planned for this period
    </div>
    <div v-else class="space-y-2">
      <MealCard v-for="meal in sortedMeals" :key="meal.id" :meal="meal" />
    </div>

    <!-- Add meal form -->
    <form class="flex flex-col gap-2 mt-6" @submit.prevent="handleSubmit">
      <input
        v-model="title"
        type="text"
        placeholder="Add a meal..."
        class="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        v-model="date"
        type="date"
        :min="mealsStore.selectedRange.start"
        :max="mealsStore.selectedRange.end"
        class="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <p v-if="validationError" class="text-red-500 text-xs">{{ validationError }}</p>
      <button
        type="submit"
        :disabled="isLoading"
        class="bg-blue-500 text-white rounded px-3 py-1 text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isLoading ? 'Adding…' : 'Add' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMealsStore } from '@/stores/meals'
import { useHouseholdStore } from '@/stores/household'
import MealCard from '@/components/MealCard.vue'

const mealsStore = useMealsStore()
const householdStore = useHouseholdStore()

const title = ref('')
const date = ref(mealsStore.selectedRange.start ?? '')
const validationError = ref('')
const isLoading = ref(false)

// Keep default date in sync when the range changes
watch(
  () => mealsStore.selectedRange.start,
  (start) => { if (start) date.value = start },
)

const sortedMeals = computed(() =>
  [...mealsStore.meals].sort((a, b) => a.date.localeCompare(b.date) || a.sort_order - b.sort_order)
)

async function handleSubmit() {
  validationError.value = ''
  if (!title.value.trim()) {
    validationError.value = 'Title is required'
    return
  }
  if (!date.value) {
    validationError.value = 'Date is required'
    return
  }
  isLoading.value = true
  try {
    await mealsStore.addMeal({
      date: date.value,
      title: title.value.trim(),
      meal_type: null,
      household_id: householdStore.householdId!,
      notes: null,
      sort_order: 0,
      created_by: '',
    })
    title.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>
