<template>
  <div
    data-testid="meal-row"
    class="flex items-center gap-2 py-1.5 px-2 border-b border-[var(--color-border)] rounded transition-colors duration-150"
    style="hover:background-color: var(--color-hover-bg)"
  >
    <!-- Checkbox -->
    <label class="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" @click.stop>
      <input
        type="checkbox"
        :checked="meal.is_checked"
        class="h-5 w-5 rounded cursor-pointer"
        @change="mealsStore.toggleChecked(meal.id)"
      />
    </label>

    <!-- Title -->
    <span
      data-testid="meal-title"
      class="flex-1 text-base"
      :class="meal.is_checked ? ['line-through', 'text-[var(--color-text-muted)]'] : ['text-[var(--color-text-primary)]']"
    >
      {{ meal.title }}
    </span>

    <!-- Linked grocery count badge -->
    <span
      v-if="linkedGroceryCount > 0"
      data-testid="linked-count-badge"
      class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full"
      style="background-color: var(--color-accent); color: #fff"
    >
      {{ linkedGroceryCount }}
    </span>

    <!-- Edit button -->
    <button
      data-testid="edit-btn"
      aria-label="Edit meal"
      class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors duration-150 flex-shrink-0"
      style="color: var(--color-text-muted)"
      @click.stop="showEdit = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    </button>

    <!-- Delete button -->
    <button
      data-testid="delete-btn"
      aria-label="Delete meal"
      class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors duration-150 flex-shrink-0"
      style="color: var(--color-text-muted)"
      @click.stop="handleDelete"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Edit modal -->
    <MealEditModal v-if="showEdit" :meal="meal" :linked-item-ids="linkedItemIds" @close="showEdit = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Meal } from '@/types/database'
import { useMealsStore } from '@/stores/meals'
import MealEditModal from '@/components/MealEditModal.vue'

const props = defineProps<{
  meal: Meal
  linkedGroceryCount?: number
  linkedItemIds?: string[]
}>()

const mealsStore = useMealsStore()
const showEdit = ref(false)

function handleDelete() {
  if (window.confirm(`Delete "${props.meal.title}"?`)) {
    mealsStore.deleteMeal(props.meal.id)
  }
}
</script>
