<template>
  <form class="flex flex-col gap-2 mt-2" @submit.prevent="handleSubmit">
    <input
      v-model="title"
      type="text"
      placeholder="Add a meal..."
      class="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
    <p v-if="validationError" class="text-red-500 text-xs">{{ validationError }}</p>
    <select
      v-model="mealType"
      class="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <option value="">— (no type)</option>
      <option value="breakfast">Breakfast</option>
      <option value="lunch">Lunch</option>
      <option value="dinner">Dinner</option>
    </select>
    <button
      type="submit"
      :disabled="isLoading"
      class="bg-blue-500 text-white rounded px-3 py-1 text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ isLoading ? 'Adding…' : 'Add' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MealType } from '@/types/database'
import { useMealsStore } from '@/stores/meals'
import { useHouseholdStore } from '@/stores/household'

const props = defineProps<{ date: string }>()

const mealsStore = useMealsStore()
const householdStore = useHouseholdStore()

const title = ref('')
const mealType = ref('')
const validationError = ref('')
const isLoading = ref(false)

async function handleSubmit() {
  validationError.value = ''

  if (!title.value.trim()) {
    validationError.value = 'Title is required'
    return
  }

  isLoading.value = true
  try {
    await mealsStore.addMeal({
      date: props.date,
      title: title.value.trim(),
      meal_type: (mealType.value as MealType) || null,
      household_id: householdStore.householdId!,
      notes: null,
      sort_order: 0,
      created_by: '',
    })
    title.value = ''
    mealType.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>
