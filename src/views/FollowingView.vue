<template>
  <div class="p-4 max-w-5xl mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Discover</h2>
      <button class="btn-primary" @click="openAdd">+ Add Recipe</button>
    </div>

    <!-- Fridge sync -->
    <div class="mb-4">
      <label class="block text-xs text-text-secondary mb-1 font-medium">What's in your fridge?</label>
      <input
        v-model="followingStore.fridgeInput"
        type="text"
        class="input"
        placeholder="avocado, eggs, spinach, garlic..."
      />
      <p v-if="followingStore.fridgeTokens.length" class="text-xs text-text-muted mt-1">
        Matching against {{ followingStore.fridgeTokens.length }} ingredient{{ followingStore.fridgeTokens.length !== 1 ? 's' : '' }}
      </p>
    </div>

    <!-- Effort filter -->
    <div class="flex flex-wrap gap-1.5 mb-2">
      <button
        v-for="opt in EFFORT_OPTIONS"
        :key="opt.value"
        type="button"
        class="btn-ghost text-xs min-h-[36px] px-3 py-1"
        :class="followingStore.effortFilter === opt.value ? 'bg-accent/10 text-accent font-semibold' : ''"
        @click="followingStore.effortFilter = opt.value"
      >{{ opt.label }}</button>
    </div>

    <!-- Protein filter -->
    <div class="flex flex-wrap gap-1.5 mb-5">
      <button
        v-for="opt in PROTEIN_OPTIONS"
        :key="opt.value"
        type="button"
        class="btn-ghost text-xs min-h-[36px] px-3 py-1"
        :class="followingStore.proteinFilter === opt.value ? 'bg-accent/10 text-accent font-semibold' : ''"
        @click="followingStore.proteinFilter = opt.value"
      >{{ opt.label }}</button>
    </div>

    <!-- Loading -->
    <div v-if="followingStore.loading" data-testid="loading-spinner">
      <BaseSpinner />
    </div>

    <!-- Error -->
    <BaseErrorBanner v-else-if="followingStore.error" :message="followingStore.error" />

    <!-- Empty (filtered) -->
    <div
      v-else-if="followingStore.filteredItems.length === 0"
      class="py-12 text-center text-text-muted"
    >
      <p class="text-lg font-medium mb-1">No recipes match your filters</p>
      <p class="text-sm">Try clearing a filter or adding your own recipe.</p>
    </div>

    <!-- Card grid -->
    <div
      v-else
      class="grid gap-3"
      style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))"
    >
      <MealCatalogCard
        v-for="meal in followingStore.filteredItems"
        :key="meal.id"
        :meal="meal"
        :fridge-active="followingStore.fridgeTokens.length > 0"
        @edit="openEdit(meal)"
        @delete="confirmDelete(meal)"
      />
    </div>

    <!-- Add / Edit modal -->
    <MealCatalogModal
      v-if="showModal"
      :meal="editingMeal"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deletingMeal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="deletingMeal = null"
        >
          <div class="modal-panel max-w-sm w-full p-6 flex flex-col gap-4">
            <h3 class="font-semibold">Delete Recipe?</h3>
            <p class="text-sm text-text-secondary">
              "{{ deletingMeal.name }}" will be permanently removed.
            </p>
            <div class="flex gap-2">
              <button class="btn-ghost flex-1" @click="deletingMeal = null">Cancel</button>
              <button class="btn-primary flex-1 bg-danger hover:bg-danger/90" @click="handleDelete">
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFollowingStore } from '@/stores/following'
import { useHouseholdStore } from '@/stores/household'
import type { MealCatalogItem } from '@/types/database'
import MealCatalogCard from '@/components/following/MealCatalogCard.vue'
import MealCatalogModal from '@/components/following/MealCatalogModal.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

const followingStore = useFollowingStore()
const householdStore = useHouseholdStore()

const showModal = ref(false)
const editingMeal = ref<MealCatalogItem | null>(null)
const deletingMeal = ref<MealCatalogItem | null>(null)

const EFFORT_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'low' as const, label: 'Low Energy' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'high' as const, label: 'High Energy' },
  { value: 'onepot' as const, label: 'One Pot' },
]

const PROTEIN_OPTIONS = [
  { value: 'all' as const, label: 'All Protein' },
  { value: 'high' as const, label: 'High' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'low' as const, label: 'Low' },
]

function openAdd() {
  editingMeal.value = null
  showModal.value = true
}

function openEdit(meal: MealCatalogItem) {
  editingMeal.value = meal
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingMeal.value = null
}

function confirmDelete(meal: MealCatalogItem) {
  deletingMeal.value = meal
}

async function handleSave(payload: {
  name: string
  category: MealCatalogItem['category']
  protein: MealCatalogItem['protein']
  cook_time: string
  emoji: string
  description: string | null
  key_ingredients: string[]
  tags: string[]
}) {
  if (!householdStore.householdId) return
  try {
    if (editingMeal.value) {
      await followingStore.updateItem(editingMeal.value.id, payload)
    } else {
      await followingStore.addItem({ ...payload, household_id: householdStore.householdId })
    }
    closeModal()
  } catch {
    // error is set in store — modal stays open
  }
}

async function handleDelete() {
  if (!deletingMeal.value) return
  await followingStore.deleteItem(deletingMeal.value.id)
  deletingMeal.value = null
}

onMounted(() => {
  followingStore.fetchCustomItems()
})
</script>
