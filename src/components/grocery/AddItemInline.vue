<template>
  <form class="flex flex-col gap-2" @submit.prevent="handleSubmit">
    <div class="flex gap-2">
      <input
        v-model="name"
        data-testid="name-input"
        type="text"
        placeholder="Item name"
        class="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        :disabled="loading"
      />
      <input
        v-model="quantity"
        data-testid="quantity-input"
        type="text"
        placeholder="Qty"
        class="w-20 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        :disabled="loading"
      />
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        data-testid="link-meals-btn"
        class="text-sm text-blue-600 hover:underline disabled:opacity-50"
        :disabled="loading"
        @click="showMealPicker = true"
      >
        Link meals{{ selectedMealIds.length > 0 ? ` (${selectedMealIds.length})` : '' }}
      </button>
    </div>

    <p v-if="error" data-testid="error-msg" class="text-red-600 text-sm">{{ error }}</p>

    <button
      type="submit"
      data-testid="submit-btn"
      class="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
      :disabled="loading || !name.trim()"
    >
      {{ loading ? 'Saving...' : isEditMode ? 'Save' : 'Add Item' }}
    </button>

    <MealLinkPicker
      v-if="showMealPicker"
      v-model="selectedMealIds"
      @close="showMealPicker = false"
    />
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGroceryStore } from '@/stores/grocery'
import MealLinkPicker from './MealLinkPicker.vue'

const props = defineProps<{
  sectionId: string
  householdId: string
  itemId?: string
  initialName?: string
  initialQuantity?: string
  initialMealIds?: string[]
}>()

const emit = defineEmits<{
  submitted: []
}>()

const groceryStore = useGroceryStore()

const name = ref(props.initialName ?? '')
const quantity = ref(props.initialQuantity ?? '')
const selectedMealIds = ref<string[]>(props.initialMealIds ? [...props.initialMealIds] : [])
const showMealPicker = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const isEditMode = computed(() => !!props.itemId)

async function handleSubmit() {
  if (!name.value.trim()) {
    error.value = 'Name is required'
    return
  }

  loading.value = true
  error.value = null

  try {
    let targetItemId: string | undefined = props.itemId

    if (isEditMode.value && targetItemId) {
      await groceryStore.updateItem(targetItemId, {
        name: name.value.trim(),
        quantity: quantity.value || null,
      })
    } else {
      const itemsBefore = new Set(groceryStore.items.map((i: any) => i.id))
      await groceryStore.addItem({
        name: name.value.trim(),
        quantity: quantity.value || null,
        section_id: props.sectionId,
        household_id: props.householdId,
      })
      const newItem = groceryStore.items.find((i: any) => !itemsBefore.has(i.id))
      targetItemId = newItem?.id
    }

    if (targetItemId && selectedMealIds.value.length > 0) {
      await groceryStore.linkItemToMeals(targetItemId, selectedMealIds.value)
    }

    if (!isEditMode.value) {
      name.value = ''
      quantity.value = ''
      selectedMealIds.value = []
    }

    emit('submitted')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save item'
  } finally {
    loading.value = false
  }
}
</script>
