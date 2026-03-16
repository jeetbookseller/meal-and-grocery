<template>
  <div class="mt-2">
    <template v-if="!isAdding">
      <button
        data-testid="add-section-btn"
        class="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg"
        @click="isAdding = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Add Section
      </button>
    </template>
    <template v-else>
      <form class="flex gap-2" @submit.prevent="submit">
        <input
          v-model="name"
          type="text"
          placeholder="Section name"
          class="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          @keydown.escape="isAdding = false"
        />
        <button
          type="submit"
          data-testid="add-section-btn"
          class="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Add
        </button>
        <button
          type="button"
          class="px-2 py-1 text-sm text-gray-600 rounded hover:bg-gray-100"
          @click="isAdding = false"
        >
          Cancel
        </button>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGroceryStore } from '@/stores/grocery'

const groceryStore = useGroceryStore()
const isAdding = ref(false)
const name = ref('')

async function submit() {
  if (name.value.trim()) {
    await groceryStore.addSection(name.value.trim())
    name.value = ''
    isAdding.value = false
  }
}
</script>
