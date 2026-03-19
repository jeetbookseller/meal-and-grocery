<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" @click.self="$emit('close')">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />

    <!-- Modal panel -->
    <Transition name="modal">
      <div class="modal-panel relative z-10 max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Edit Meal</h2>
          <button
            data-testid="modal-close"
            type="button"
            class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors duration-150"
            style="color: var(--color-text-muted)"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--color-text-primary)">Title</label>
            <input
              v-model="title"
              type="text"
              required
              class="input"
            />
          </div>

          <div>
            <button
              type="button"
              data-testid="link-groceries-btn"
              class="btn-ghost w-full text-left min-h-[44px]"
              :disabled="isLoading"
              @click="showGroceryPicker = true"
            >
              {{ selectedItemIds.length > 0 ? `Linked to ${selectedItemIds.length} grocery item(s)` : 'Link to groceries...' }}
            </button>
          </div>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="btn-ghost"
              @click="$emit('close')"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="btn-primary"
            >
              {{ isLoading ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </div>

  <!-- Grocery link picker -->
  <GroceryLinkPicker
    v-if="showGroceryPicker"
    v-model="selectedItemIds"
    @close="showGroceryPicker = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Meal } from '@/types/database'
import { useMealsStore } from '@/stores/meals'
import { useGroceryStore } from '@/stores/grocery'
import GroceryLinkPicker from '@/components/grocery/GroceryLinkPicker.vue'

const props = defineProps<{
  meal: Meal
  linkedItemIds?: string[]
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const mealsStore = useMealsStore()
const groceryStore = useGroceryStore()

const title = ref(props.meal.title)
const isLoading = ref(false)
const showGroceryPicker = ref(false)
const selectedItemIds = ref<string[]>(props.linkedItemIds ? [...props.linkedItemIds] : [])

async function handleSubmit() {
  isLoading.value = true
  try {
    await mealsStore.updateMeal(props.meal.id, { title: title.value })
    if (!mealsStore.error) {
      await groceryStore.linkMealToItems(props.meal.id, selectedItemIds.value)
      emit('close')
    }
  } finally {
    isLoading.value = false
  }
}
</script>
