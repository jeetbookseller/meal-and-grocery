<template>
  <div class="mt-2">
    <template v-if="!isAdding">
      <button
        data-testid="add-section-btn"
        class="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors duration-150"
        style="color: var(--color-accent)"
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
          class="input flex-1 text-sm"
          @keydown.escape="isAdding = false"
        />
        <button
          type="submit"
          data-testid="add-section-btn"
          class="btn-primary text-sm px-3"
        >
          Add
        </button>
        <button
          type="button"
          class="btn-ghost text-sm px-3"
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
