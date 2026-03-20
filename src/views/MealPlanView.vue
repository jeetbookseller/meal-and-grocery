<template>
  <div class="p-4 max-w-3xl mx-auto">
    <!-- Add meal form -->
    <form class="flex gap-2 mb-4" @submit.prevent="handleAdd">
      <input
        v-model="newTitle"
        data-testid="add-meal-input"
        type="text"
        placeholder="Add a meal..."
        class="input flex-1"
      />
      <input
        v-model="newMealType"
        data-testid="add-meal-type-input"
        type="text"
        placeholder="Type (optional)"
        class="input hidden sm:block"
        style="max-width: 140px"
        list="meal-type-options-add"
      />
      <datalist id="meal-type-options-add">
        <option v-for="opt in mealsStore.mealTypeOptions" :key="opt" :value="opt" />
      </datalist>
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

    <!-- Grouped view -->
    <template v-else-if="groupByType">
      <div v-for="group in mealsStore.groupedMeals" :key="group.label">
        <h3
          data-testid="meal-group-header"
          class="text-sm font-semibold mt-4 mb-1 px-2"
          style="color: var(--color-text-secondary)"
        >
          {{ group.label }}
        </h3>
        <MealRow
          v-for="meal in group.meals"
          :key="meal.id"
          :meal="meal"
          :linked-grocery-count="groceryStore.mealGroceryCounts[meal.id] ?? 0"
          :linked-item-ids="groceryStore.mealItemIds[meal.id] ?? []"
        />
      </div>
    </template>

    <!-- Flat list: unchecked first, then checked -->
    <template v-else>
      <MealRow
        v-for="meal in sortedMeals"
        :key="meal.id"
        :meal="meal"
        :linked-grocery-count="groceryStore.mealGroceryCounts[meal.id] ?? 0"
        :linked-item-ids="groceryStore.mealItemIds[meal.id] ?? []"
      />
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <ClearCheckedButton @clear="mealsStore.clearChecked()" />
      <button
        type="button"
        data-testid="group-by-type-toggle"
        class="btn-ghost"
        @click="groupByType = !groupByType"
      >
        {{ groupByType ? 'Flat list' : 'Group by type' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMealsStore } from '@/stores/meals'
import { useGroceryStore } from '@/stores/grocery'
import { useHouseholdStore } from '@/stores/household'
import MealRow from '@/components/MealRow.vue'
import ClearCheckedButton from '@/components/ClearCheckedButton.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

const mealsStore = useMealsStore()
const groceryStore = useGroceryStore()
const householdStore = useHouseholdStore()

const newTitle = ref('')
const newMealType = ref('')
const adding = ref(false)
const groupByType = ref(false)

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
      sort_order: mealsStore.meals.length > 0
        ? Math.max(...mealsStore.meals.map((m) => m.sort_order)) + 1
        : 0,
      meal_type: newMealType.value.trim() || null,
    })
    newTitle.value = ''
    newMealType.value = ''
  } finally {
    adding.value = false
  }
}

onMounted(async () => {
  mealsStore.fetchMeals()
  mealsStore.subscribeRealtime()
  await groceryStore.fetchItems()
  groceryStore.fetchItemMealLinks()
})

onUnmounted(() => {
  mealsStore.unsubscribeRealtime()
})
</script>
