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
            <label class="block text-sm font-medium mb-1" style="color: var(--color-text-primary)">Type</label>
            <select
              v-model="mealType"
              class="input"
            >
              <option value="">— (no type)</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--color-text-primary)">Notes</label>
            <textarea
              v-model="notes"
              rows="3"
              class="input"
            />
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
