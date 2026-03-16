<template>
  <div data-testid="grocery-section" class="border border-gray-200 rounded-lg mb-3 overflow-hidden">
    <!-- Section Header -->
    <div class="flex items-center gap-2 px-3 py-2 bg-gray-50">
      <button
        data-testid="toggle-btn"
        class="p-1 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
        @click="isExpanded = !isExpanded"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 transition-transform"
          :class="isExpanded ? 'rotate-0' : '-rotate-90'"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>

      <template v-if="!isRenaming">
        <span class="font-medium text-gray-800 flex-1 text-sm">{{ section.name }}</span>
        <span
          data-testid="item-count"
          class="inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full"
        >
          {{ items.length }}
        </span>
        <button
          data-testid="rename-btn"
          class="p-1 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          @click="startRename"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          v-if="items.length === 0"
          data-testid="delete-btn"
          class="p-1 text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          @click="groceryStore.deleteSection(section.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </template>

      <template v-else>
        <form data-testid="rename-form" class="flex-1 flex gap-1" @submit.prevent="submitRename">
          <input
            data-testid="rename-input"
            v-model="renameValue"
            type="text"
            class="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
            @keydown.escape="isRenaming = false"
          />
          <button type="submit" class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
          <button type="button" class="px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100" @click="isRenaming = false">Cancel</button>
        </form>
      </template>
    </div>

    <!-- Section Body -->
    <div v-show="isExpanded" data-testid="section-body" class="divide-y divide-gray-100">
      <GroceryItem
        v-for="item in items"
        :key="item.id"
        :item="item"
      />
      <div v-if="items.length === 0" class="px-4 py-3 text-sm text-gray-400 italic">
        No items in this section
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGroceryStore } from '@/stores/grocery'
import type { GrocerySection, GroceryItem as GroceryItemType } from '@/types/database'
import GroceryItem from '@/components/GroceryItem.vue'

const props = defineProps<{
  section: GrocerySection
  items: GroceryItemType[]
}>()

const groceryStore = useGroceryStore()
const isExpanded = ref(true)
const isRenaming = ref(false)
const renameValue = ref(props.section.name)

function startRename() {
  renameValue.value = props.section.name
  isRenaming.value = true
}

async function submitRename() {
  if (renameValue.value.trim()) {
    await groceryStore.renameSection(props.section.id, renameValue.value.trim())
  }
  isRenaming.value = false
}
</script>
