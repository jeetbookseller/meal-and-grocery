<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h2 class="text-xl font-semibold mb-4">Grocery List</h2>

    <!-- Global Add to List -->
    <form class="flex gap-2 mb-4" @submit.prevent="handleAddItem">
      <input
        v-model="newItemName"
        data-testid="global-add-input"
        type="text"
        placeholder="Add to list..."
        class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        :disabled="addingItem || !groceryStore.ungroupedSection"
      />
      <button
        type="submit"
        data-testid="global-add-btn"
        class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        :disabled="addingItem || !newItemName.trim() || !groceryStore.ungroupedSection"
      >
        {{ addingItem ? 'Adding...' : 'Add' }}
      </button>
    </form>

    <!-- Loading -->
    <div v-if="groceryStore.loading" data-testid="loading-spinner">
      <BaseSpinner />
    </div>

    <!-- Error -->
    <BaseErrorBanner v-else-if="groceryStore.error" :message="groceryStore.error" />

    <!-- Empty state -->
    <div
      v-else-if="groceryStore.sections.length === 0"
      data-testid="empty-state"
      class="py-12 text-center text-gray-400"
    >
      <p class="text-lg font-medium mb-1">Your grocery list is empty</p>
      <p class="text-sm">Add an item above to get started.</p>
    </div>

    <!-- Sections -->
    <template v-else>
      <GrocerySection
        v-for="section in sortedSections"
        :key="section.id"
        :section="section"
        :items="groceryStore.itemsBySection[section.id] ?? []"
        @edit="editingItem = $event"
      />
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <AddSectionButton />
      <ClearCheckedButton />
    </div>

    <!-- Item edit modal -->
    <GroceryItemEditModal
      v-if="editingItem"
      :item="editingItem"
      @close="editingItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGroceryStore } from '@/stores/grocery'
import { useHouseholdStore } from '@/stores/household'
import type { GroceryItem } from '@/types/database'
import GrocerySection from '@/components/GrocerySection.vue'
import AddSectionButton from '@/components/AddSectionButton.vue'
import ClearCheckedButton from '@/components/ClearCheckedButton.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'
import GroceryItemEditModal from '@/components/grocery/GroceryItemEditModal.vue'

const groceryStore = useGroceryStore()
const householdStore = useHouseholdStore()

const newItemName = ref('')
const addingItem = ref(false)
const editingItem = ref<GroceryItem | null>(null)

const sortedSections = computed(() =>
  [...groceryStore.sections].sort((a, b) => {
    if (a.name === 'Ungrouped') return -1
    if (b.name === 'Ungrouped') return 1
    return a.sort_order - b.sort_order
  })
)

async function handleAddItem() {
  const name = newItemName.value.trim()
  if (!name || !groceryStore.ungroupedSection || !householdStore.householdId) return
  addingItem.value = true
  try {
    await groceryStore.addItem({
      name,
      section_id: groceryStore.ungroupedSection.id,
      household_id: householdStore.householdId,
    })
    newItemName.value = ''
  } finally {
    addingItem.value = false
  }
}

onMounted(async () => {
  await groceryStore.fetchSections()
  await groceryStore.ensureUngroupedSection()
  groceryStore.fetchItems()
  groceryStore.subscribeRealtime()
})

onUnmounted(() => {
  groceryStore.unsubscribeRealtime()
})
</script>
