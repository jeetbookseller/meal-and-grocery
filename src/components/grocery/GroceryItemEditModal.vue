<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="modal-panel max-w-md p-6">
      <h3 class="text-lg font-semibold mb-4" style="color: var(--color-text-primary)">Edit Item</h3>

      <form @submit.prevent="handleSave">
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary)">Name</label>
            <input
              v-model="name"
              data-testid="edit-name-input"
              type="text"
              class="input"
              :disabled="loading"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary)">Quantity</label>
            <input
              v-model="quantity"
              data-testid="edit-quantity-input"
              type="text"
              placeholder="e.g. 2 lbs"
              class="input"
              :disabled="loading"
            />
          </div>

          <div>
            <button
              type="button"
              data-testid="link-meals-btn"
              class="btn-ghost w-full text-left min-h-[44px]"
              :disabled="loading"
              @click="showMealPicker = true"
            >
              {{ selectedMealIds.length > 0 ? `Linked to ${selectedMealIds.length} meal(s)` : 'Link to meals...' }}
            </button>
          </div>

          <p v-if="error" class="text-sm" style="color: var(--color-danger)">{{ error }}</p>
        </div>

        <div class="flex justify-between items-center mt-6">
          <button
            type="button"
            data-testid="delete-item-btn"
            class="px-4 min-h-[44px] text-sm disabled:opacity-50"
            style="color: var(--color-danger)"
            :disabled="loading"
            @click="handleDelete"
          >
            Delete
          </button>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-ghost"
              :disabled="loading"
              @click="$emit('close')"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="save-item-btn"
              class="btn-primary min-h-[44px]"
              :disabled="loading || !name.trim()"
            >
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Meal link picker -->
  <MealLinkPicker
    v-if="showMealPicker"
    v-model="selectedMealIds"
    @close="showMealPicker = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGroceryStore } from '@/stores/grocery'
import type { GroceryItem } from '@/types/database'
import MealLinkPicker from '@/components/grocery/MealLinkPicker.vue'

const props = defineProps<{
  item: GroceryItem
  linkedMealIds?: string[]
}>()

const emit = defineEmits<{
  close: []
}>()

const groceryStore = useGroceryStore()

const name = ref(props.item.name)
const quantity = ref(props.item.quantity ?? '')
const loading = ref(false)
const error = ref<string | null>(null)
const showMealPicker = ref(false)
const selectedMealIds = ref<string[]>(props.linkedMealIds ? [...props.linkedMealIds] : [])

async function handleSave() {
  if (!name.value.trim()) return
  loading.value = true
  error.value = null
  try {
    await groceryStore.updateItem(props.item.id, {
      name: name.value.trim(),
      quantity: quantity.value || null,
    })
    await groceryStore.linkItemToMeals(props.item.id, selectedMealIds.value)
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
