<template>
  <div class="day-column bg-white rounded-lg shadow p-3 min-w-[160px]">
    <h3 class="font-semibold text-sm text-gray-600 mb-2">{{ formattedDate }}</h3>
    <p v-if="meals.length === 0" class="text-xs text-gray-400 italic">No meals planned — add one below</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Meal } from '@/types/database'

const props = defineProps<{
  date: string
  meals: Meal[]
}>()

const formattedDate = computed(() => {
  const d = new Date(props.date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
})
</script>
