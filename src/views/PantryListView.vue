<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Pantry</h2>
    </div>

    <!-- Global Add to Pantry -->
    <form class="flex gap-2 mb-4" @submit.prevent="handleAddItem">
      <input
        v-model="newItemName"
        data-testid="global-add-input"
        type="text"
        placeholder="Add to pantry..."
        class="input flex-1"
        :disabled="addingItem"
      />
      <button
        type="submit"
        data-testid="global-add-btn"
        class="btn-primary"
        :disabled="addingItem || !newItemName.trim()"
      >
        {{ addingItem ? 'Adding...' : 'Add' }}
      </button>
    </form>

    <!-- Loading -->
    <div v-if="pantryStore.loading" data-testid="loading-spinner">
      <BaseSpinner />
    </div>

    <!-- Error -->
    <BaseErrorBanner v-else-if="pantryStore.error" :message="pantryStore.error" />

    <!-- Empty state -->
    <div
      v-else-if="pantryStore.items.length === 0"
      data-testid="empty-state"
      class="py-12 text-center text-gray-400"
    >
      <p class="text-lg font-medium mb-1">Your pantry is empty</p>
      <p class="text-sm">Add an item above to get started.</p>
    </div>

    <!-- Item list -->
    <template v-else>
      <PantryItem
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        :linked-meals="pantryStore.itemMealLinks[item.id]"
        @edit="editingItem = $event"
        @delete="pantryStore.deleteItem($event.id)"
      />
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <ClearCheckedButton @clear="pantryStore.clearChecked()" />
    </div>

    <!-- Item edit modal -->
    <PantryItemEditModal
      v-if="editingItem"
      :item="editingItem"
      :linked-meal-ids="(pantryStore.itemMealLinks[editingItem.id] ?? []).map(m => m.id)"
      @close="editingItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePantryStore } from '@/stores/pantry'
import { useHouseholdStore } from '@/stores/household'
import type { PantryItem as PantryItemType } from '@/types/database'
import PantryItem from '@/components/PantryItem.vue'
import ClearCheckedButton from '@/components/ClearCheckedButton.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'
import PantryItemEditModal from '@/components/pantry/PantryItemEditModal.vue'

const pantryStore = usePantryStore()
const householdStore = useHouseholdStore()

const newItemName = ref('')
const addingItem = ref(false)
const editingItem = ref<PantryItemType | null>(null)

const sortedItems = computed(() =>
  [...pantryStore.items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
    return a.sort_order - b.sort_order
  })
)

async function handleAddItem() {
  const name = newItemName.value.trim()
  if (!name || !householdStore.householdId) return
  addingItem.value = true
  try {
    await pantryStore.addItem({
      name,
      household_id: householdStore.householdId,
    })
    newItemName.value = ''
  } finally {
    addingItem.value = false
  }
}

onMounted(async () => {
  await pantryStore.fetchItems()
  pantryStore.fetchItemMealLinks()
  pantryStore.subscribeRealtime()
})

onUnmounted(() => {
  pantryStore.unsubscribeRealtime()
})
</script>
