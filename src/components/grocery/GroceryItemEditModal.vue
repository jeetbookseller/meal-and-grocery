<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Edit Item</h3>

      <form @submit.prevent="handleSave">
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="name"
              data-testid="edit-name-input"
              type="text"
              class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="loading"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              v-model="quantity"
              data-testid="edit-quantity-input"
              type="text"
              placeholder="e.g. 2 lbs"
              class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="loading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              v-model="sectionId"
              data-testid="edit-section-select"
              class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="loading"
            >
              <option v-for="section in groceryStore.sections" :key="section.id" :value="section.id">
                {{ section.name }}
              </option>
            </select>
          </div>

          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
        </div>

        <div class="flex justify-between items-center mt-6">
          <button
            type="button"
            data-testid="delete-item-btn"
            class="px-4 py-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            :disabled="loading"
            @click="handleDelete"
          >
            Delete
          </button>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              :disabled="loading"
              @click="$emit('close')"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="save-item-btn"
              class="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              :disabled="loading || !name.trim()"
            >
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGroceryStore } from '@/stores/grocery'
import type { GroceryItem } from '@/types/database'

const props = defineProps<{
  item: GroceryItem
}>()

const emit = defineEmits<{
  close: []
}>()

const groceryStore = useGroceryStore()

const name = ref(props.item.name)
const quantity = ref(props.item.quantity ?? '')
const sectionId = ref(props.item.section_id)
const loading = ref(false)
const error = ref<string | null>(null)

async function handleSave() {
  if (!name.value.trim()) return
  loading.value = true
  error.value = null
  try {
    await groceryStore.updateItem(props.item.id, {
      name: name.value.trim(),
      quantity: quantity.value || null,
      section_id: sectionId.value,
    })
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save item'
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  loading.value = true
  error.value = null
  try {
    await groceryStore.deleteItem(props.item.id)
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete item'
  } finally {
    loading.value = false
  }
}
</script>
