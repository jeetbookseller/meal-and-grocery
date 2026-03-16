<template>
  <div
    data-testid="grocery-item"
    class="flex items-center gap-2 py-2 px-1 cursor-pointer hover:bg-gray-50"
    @click="$emit('edit', item)"
  >
    <label
      class="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
      @click.stop
    >
      <input
        type="checkbox"
        :checked="item.is_checked"
        class="h-5 w-5 rounded border-gray-300 text-indigo-600"
        @change="groceryStore.toggleChecked(item.id)"
      />
    </label>
    <div class="flex-1 min-w-0">
      <span :class="['text-sm', item.is_checked ? 'line-through text-gray-400' : 'text-gray-800']">
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
          class="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
        >
          {{ meal.title }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGroceryStore } from '@/stores/grocery'
import type { GroceryItem } from '@/types/database'

defineProps<{
  item: GroceryItem
  linkedMeals?: Array<{ id: string; title: string }>
}>()

defineEmits<{
  edit: [item: GroceryItem]
}>()

const groceryStore = useGroceryStore()
</script>
