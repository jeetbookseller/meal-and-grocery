<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h2 class="text-xl font-semibold mb-4">Grocery List</h2>

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
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

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
