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
    <div v-if="groceryStore.loading" data-testid="loading-spinner">
      <BaseSpinner />
    </div>

    <!-- Error -->
    <BaseErrorBanner v-else-if="groceryStore.error" :message="groceryStore.error" />

    <!-- Empty state -->
    <div
      v-else-if="groceryStore.items.length === 0"
      data-testid="empty-state"
      class="py-12 text-center text-gray-400"
    >
      <p class="text-lg font-medium mb-1">Your grocery list is empty</p>
      <p class="text-sm">Add an item above to get started.</p>
    </div>

    <!-- Flat item list -->
    <template v-else>
      <GroceryItem
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        @edit="editingItem = $event"
        @delete="groceryStore.deleteItem($event.id)"
      />
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <ClearCheckedButton @clear="groceryStore.clearChecked()" />
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
import type { GroceryItem as GroceryItemType } from '@/types/database'
import GroceryItem from '@/components/GroceryItem.vue'
import ClearCheckedButton from '@/components/ClearCheckedButton.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'
import GroceryItemEditModal from '@/components/grocery/GroceryItemEditModal.vue'

const groceryStore = useGroceryStore()
const householdStore = useHouseholdStore()

const newItemName = ref('')
const addingItem = ref(false)
const editingItem = ref<GroceryItemType | null>(null)

const sortedItems = computed(() =>
  [...groceryStore.items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
    return a.sort_order - b.sort_order
  })
)

async function handleAddItem() {
  const name = newItemName.value.trim()
  if (!name || !householdStore.householdId) return
  addingItem.value = true
  try {
    await groceryStore.addItem({
      name,
      household_id: householdStore.householdId,
    })
    newItemName.value = ''
  } finally {
    addingItem.value = false
  }
}

onMounted(() => {
  groceryStore.fetchItems()
  groceryStore.subscribeRealtime()
})

onUnmounted(() => {
  groceryStore.unsubscribeRealtime()
})
</script>
