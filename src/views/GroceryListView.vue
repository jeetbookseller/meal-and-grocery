<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Grocery List</h2>
      <button
        type="button"
        data-testid="group-toggle-btn"
        class="btn-ghost min-h-[44px]"
        @click="groupingMode = groupingMode === 'default' ? 'by-store' : 'default'"
      >
        {{ groupingMode === 'default' ? 'By Store' : 'Default' }}
      </button>
    </div>

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

    <!-- Item list -->
    <template v-else>
      <!-- By Store mode -->
      <template v-if="groupingMode === 'by-store'">
        <div
          v-for="group in groupedItems"
          :key="group.store ?? '__no_store__'"
        >
          <div
            data-testid="store-group-header"
            class="text-lg font-semibold px-2 py-2 mt-3 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-background)]"
            style="color: var(--color-text-primary)"
          >
            {{ group.store ?? 'No store' }}
          </div>
          <GroceryItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :linked-meals="groceryStore.itemMealLinks[item.id]"
            :hide-store="true"
            @edit="editingItem = $event"
            @delete="groceryStore.deleteItem($event.id)"
          />
        </div>
      </template>
      <!-- Default mode -->
      <template v-else>
        <GroceryItem
          v-for="item in sortedItems"
          :key="item.id"
          :item="item"
          :linked-meals="groceryStore.itemMealLinks[item.id]"
          @edit="editingItem = $event"
          @delete="groceryStore.deleteItem($event.id)"
        />
      </template>
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <ClearCheckedButton @clear="groceryStore.clearChecked()" />
    </div>

    <!-- Item edit modal -->
    <GroceryItemEditModal
      v-if="editingItem"
      :item="editingItem"
      :linked-meal-ids="(groceryStore.itemMealLinks[editingItem.id] ?? []).map(m => m.id)"
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
const groupingMode = ref<'default' | 'by-store'>('default')

const sortedItems = computed(() =>
  [...groceryStore.items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
    return a.sort_order - b.sort_order
  })
)

const groupedItems = computed(() => {
  const sorted = [...groceryStore.items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
    return a.sort_order - b.sort_order
  })
  const groups = new Map<string | null, GroceryItemType[]>()
  for (const item of sorted) {
    const key = item.store || null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1
      if (b === null) return -1
      return a.localeCompare(b)
    })
    .map(([store, items]) => ({ store, items }))
})

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

onMounted(async () => {
  await groceryStore.fetchItems()
  groceryStore.fetchItemMealLinks()
  groceryStore.subscribeRealtime()
})

onUnmounted(() => {
  groceryStore.unsubscribeRealtime()
})
</script>
