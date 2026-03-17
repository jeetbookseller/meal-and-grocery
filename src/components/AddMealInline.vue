<template>
  <form class="flex flex-col gap-2 mt-2" @submit.prevent="handleSubmit">
    <input
      v-model="title"
      type="text"
      placeholder="Add a meal..."
      class="input"
    />
    <p v-if="validationError" class="text-xs" style="color: var(--color-danger)">{{ validationError }}</p>
    <select
      v-model="mealType"
      class="input"
    >
      <option value="">— (no type)</option>
      <option value="breakfast">Breakfast</option>
      <option value="lunch">Lunch</option>
      <option value="dinner">Dinner</option>
    </select>
    <button
      type="submit"
      :disabled="isLoading"
      class="btn-primary"
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
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ date: string }>()

const mealsStore = useMealsStore()
const householdStore = useHouseholdStore()
const authStore = useAuthStore()

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
      created_by: authStore.user!.id,
    })
    title.value = ''
    mealType.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>
