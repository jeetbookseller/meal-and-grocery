<template>
  <div
    data-testid="pantry-item"
    class="flex items-center gap-2 py-1.5 px-2 border-b border-[var(--color-border)] hover:bg-gray-50"
  >
    <label
      class="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
      @click.stop
    >
      <input
        type="checkbox"
        :checked="item.is_checked"
        class="h-5 w-5 rounded border-gray-300 text-indigo-600"
        @change="pantryStore.toggleChecked(item.id)"
      />
    </label>
    <div class="flex-1 min-w-0">
      <span
        data-testid="item-name"
        :class="['text-base', item.is_checked ? 'line-through text-gray-400' : 'text-gray-800']"
      >
        {{ item.name }}
      </span>
      <span v-if="item.quantity !== null" data-testid="item-quantity" class="ml-1 text-xs text-gray-500">
        {{ item.quantity }}
      </span>
      <div v-if="linkedMeals && linkedMeals.length > 0" class="flex flex-wrap gap-1 mt-1">
        <span
          v-for="meal in linkedMeals"
          :key="meal.id"
          data-testid="meal-badge"
          class="inline-block px-2 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full"
        >
          {{ meal.title }}
        </span>
      </div>
    </div>
    <button
      data-testid="edit-item-btn"
      aria-label="Edit item"
      class="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
      @click.stop="$emit('edit', item)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    </button>
    <button
      data-testid="delete-item-btn"
      aria-label="Delete item"
      class="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 rounded flex-shrink-0"
      @click.stop="$emit('delete', item)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { usePantryStore } from '@/stores/pantry'
import type { PantryItem } from '@/types/database'

defineProps<{
  item: PantryItem
  linkedMeals?: Array<{ id: string; title: string }>
}>()

defineEmits<{
  edit: [item: PantryItem]
  delete: [item: PantryItem]
}>()

const pantryStore = usePantryStore()
</script>
