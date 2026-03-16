import { defineStore } from 'pinia'
import { ref } from 'vue'

// Full implementation in TASK-04
export const useHouseholdStore = defineStore('household', () => {
  const householdId = ref<string | null>(null)
  const householdName = ref<string | null>(null)
  const ready = ref(false)

  return { householdId, householdName, ready }
})
