<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center" @click.self="$emit('close')">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />

    <!-- Modal panel -->
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Edit Meal</h2>
        <button
          data-testid="modal-close"
          type="button"
          class="text-gray-400 hover:text-gray-600"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            v-model="title"
            type="text"
            required
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            v-model="mealType"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">— (no type)</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            v-model="notes"
            rows="3"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="bg-blue-500 text-white rounded px-4 py-2 text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Meal, MealType } from '@/types/database'
import { useMealsStore } from '@/stores/meals'

const props = defineProps<{ meal: Meal }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const mealsStore = useMealsStore()

const title = ref(props.meal.title)
const mealType = ref(props.meal.meal_type ?? '')
const notes = ref(props.meal.notes ?? '')
const isLoading = ref(false)

async function handleSubmit() {
  isLoading.value = true
  try {
    await mealsStore.updateMeal(props.meal.id, {
      title: title.value,
      meal_type: (mealType.value as MealType) || null,
      notes: notes.value || null,
    })
    if (!mealsStore.error) {
      emit('close')
    }
  } finally {
    isLoading.value = false
  }
}
</script>
