import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GrocerySection, GroceryItem } from '@/types/database'

// Full implementation in TASK-06
export const useGroceryStore = defineStore('grocery', () => {
  const sections = ref<GrocerySection[]>([])
  const items = ref<GroceryItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const itemsBySection = computed(() => {
    const map: Record<string, GroceryItem[]> = {}
    for (const item of items.value) {
      if (!map[item.section_id]) map[item.section_id] = []
      map[item.section_id].push(item)
    }
    return map
  })

  return { sections, items, loading, error, itemsBySection }
})
