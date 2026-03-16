<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h2 class="text-xl font-semibold mb-4">Grocery List</h2>

    <!-- Loading -->
    <div v-if="groceryStore.loading" data-testid="loading-spinner" class="flex justify-center py-8">
      <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Error -->
    <div v-else-if="groceryStore.error" class="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
      {{ groceryStore.error }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="groceryStore.sections.length === 0"
      data-testid="empty-state"
      class="py-12 text-center text-gray-400"
    >
      <p class="text-lg font-medium mb-1">Your grocery list is empty</p>
      <p class="text-sm">Add a section to get started.</p>
    </div>

    <!-- Sections -->
    <template v-else>
      <GrocerySection
        v-for="section in groceryStore.sections"
        :key="section.id"
        :section="section"
        :items="groceryStore.itemsBySection[section.id] ?? []"
      />
    </template>

    <!-- Bottom actions -->
    <div class="flex items-center gap-2 mt-4">
      <AddSectionButton />
      <ClearCheckedButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGroceryStore } from '@/stores/grocery'
import GrocerySection from '@/components/GrocerySection.vue'
import AddSectionButton from '@/components/AddSectionButton.vue'
import ClearCheckedButton from '@/components/ClearCheckedButton.vue'

const groceryStore = useGroceryStore()

onMounted(() => {
  groceryStore.fetchSections()
  groceryStore.fetchItems()
  groceryStore.subscribeRealtime()
})

onUnmounted(() => {
  groceryStore.unsubscribeRealtime()
})
</script>
