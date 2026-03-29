<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
    data-testid="backdrop"
    @click.self="$emit('close')"
  >
    <div class="modal-panel max-w-md max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">Link to Pantry Items</h2>
        <button
          data-testid="close-btn"
          class="text-gray-500 hover:text-gray-700 text-xl leading-none"
          @click="$emit('close')"
        >
          &times;
        </button>
      </div>

      <!-- Body -->
      <div class="overflow-y-auto flex-1 p-4">
        <p v-if="!hasItems" class="text-gray-500 text-center py-4">No pantry items available</p>

        <div
          v-for="item in pantryStore.items"
          :key="item.id"
          class="flex items-center gap-2 py-1"
        >
          <input
            :id="`pantry-picker-${item.id}`"
            type="checkbox"
            :checked="modelValue.includes(item.id)"
            class="w-4 h-4 cursor-pointer"
            @change="toggleItem(item.id)"
          />
          <label :for="`pantry-picker-${item.id}`" class="cursor-pointer flex-1">
            {{ item.name }}
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t">
        <button
          data-testid="done-btn"
          class="btn-primary w-full"
          @click="$emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePantryStore } from '@/stores/pantry'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'close': []
}>()

const pantryStore = usePantryStore()

const hasItems = computed(() => pantryStore.items.length > 0)

function toggleItem(itemId: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(itemId)
  if (idx !== -1) {
    current.splice(idx, 1)
  } else {
    current.push(itemId)
  }
  emit('update:modelValue', current)
}
</script>
