<template>
  <div class="p-4 max-w-2xl mx-auto">
    <!-- Add meal form -->
    <form class="flex gap-2 mb-4" @submit.prevent="handleAdd">
      <input
        v-model="newTitle"
        data-testid="add-meal-input"
        type="text"
        placeholder="Add a meal..."
        class="input flex-1"
      />
      <button
        type="submit"
        data-testid="add-meal-btn"
        class="btn-primary"
        :disabled="!newTitle.trim() || adding"
      >
        {{ adding ? 'Adding...' : 'Add' }}
      </button>
    </form>

    <!-- Loading -->
    <BaseSpinner v-if="mealsStore.loading" />

    <!-- Error -->
    <BaseErrorBanner v-else-if="mealsStore.error" :message="mealsStore.error" />

    <!-- Empty state -->
    <div
      v-else-if="mealsStore.meals.length === 0"
      data-testid="empty-state"
      class="py-12 text-center"
      style="color: var(--color-text-muted)"
    >
      <p class="text-lg font-medium mb-1">No meals yet</p>
      <p class="text-sm">Add a meal above to get started.</p>
    </div>

    <!-- Flat list: unchecked first, then checked -->
    <template v-else>
      <MealRow
        v-for="meal in sortedMeals"
        :key="meal.id"
        :meal="meal"
        :linked-grocery-count="0"
      />
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <ClearCheckedButton @clear="mealsStore.clearChecked()" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMealsStore } from '@/stores/meals'
import { useHouseholdStore } from '@/stores/household'
import MealRow from '@/components/MealRow.vue'
import ClearCheckedButton from '@/components/ClearCheckedButton.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

const mealsStore = useMealsStore()
const householdStore = useHouseholdStore()

const newTitle = ref('')
const adding = ref(false)

const sortedMeals = computed(() => {
  const unchecked = mealsStore.meals.filter((m) => !m.is_checked).sort((a, b) => a.sort_order - b.sort_order)
  const checked = mealsStore.meals.filter((m) => m.is_checked).sort((a, b) => a.sort_order - b.sort_order)
  return [...unchecked, ...checked]
})

async function handleAdd() {
  const title = newTitle.value.trim()
  if (!title || !householdStore.householdId) return
  adding.value = true
  try {
    await mealsStore.addMeal({
      title,
      household_id: householdStore.householdId,
      sort_order: Date.now(),
    })
    newTitle.value = ''
  } finally {
    adding.value = false
  }
}

onMounted(() => {
  mealsStore.fetchMeals()
  mealsStore.subscribeRealtime()
})

onUnmounted(() => {
  mealsStore.unsubscribeRealtime()
})
</script>
