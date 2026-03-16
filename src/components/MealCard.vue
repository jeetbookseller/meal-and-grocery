<template>
  <div class="bg-white rounded-lg border border-gray-200 p-3 mb-2">
    <div class="flex items-start justify-between gap-2">
      <!-- Left: title + badge + notes -->
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-medium text-sm">{{ meal.title }}</span>
          <span
            v-if="meal.meal_type"
            data-testid="meal-type-badge"
            :class="badgeClass"
            class="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize"
          >
            {{ meal.meal_type }}
          </span>
        </div>

        <button
          v-if="meal.notes"
          data-testid="notes-toggle"
          class="text-xs text-gray-400 mt-1 hover:text-gray-600"
          @click="notesOpen = !notesOpen"
        >
          {{ notesOpen ? 'Hide notes' : 'Show notes' }}
        </button>

        <p
          v-if="notesOpen && meal.notes"
          data-testid="meal-notes"
          class="text-xs text-gray-600 mt-1 whitespace-pre-line"
        >
          {{ meal.notes }}
        </p>
      </div>

      <!-- Right: edit + delete -->
      <div class="flex gap-1 flex-shrink-0">
        <button
          data-testid="edit-btn"
          aria-label="Edit meal"
          class="p-1 text-gray-400 hover:text-gray-600 rounded"
          @click="editOpen = true"
        >
          <!-- pencil icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          data-testid="delete-btn"
          aria-label="Delete meal"
          class="p-1 text-gray-400 hover:text-red-500 rounded"
          @click="handleDelete"
        >
          <!-- trash icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editOpen" data-testid="edit-modal">
      <MealEditModal :meal="meal" @close="editOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Meal } from '@/types/database'
import { useMealsStore } from '@/stores/meals'
import MealEditModal from '@/components/MealEditModal.vue'

const props = defineProps<{ meal: Meal }>()

const mealsStore = useMealsStore()
const notesOpen = ref(false)
const editOpen = ref(false)

const badgeClass = computed(() => {
  switch (props.meal.meal_type) {
    case 'breakfast':
      return 'bg-yellow-100 text-yellow-800'
    case 'lunch':
      return 'bg-green-100 text-green-800'
    case 'dinner':
      return 'bg-blue-100 text-blue-800'
    default:
      return ''
  }
})

function handleDelete() {
  if (window.confirm(`Delete "${props.meal.title}"?`)) {
    mealsStore.deleteMeal(props.meal.id)
  }
}
</script>
