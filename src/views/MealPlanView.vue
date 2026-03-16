<template>
  <div>
    <TimelineSelector />
    <!-- Mobile: horizontal scroll; Desktop: 7-column grid -->
    <div class="mt-4 overflow-x-auto">
      <div
        class="grid gap-3"
        :style="{ gridTemplateColumns: `repeat(${dateRange.length}, minmax(160px, 1fr))` }"
      >
        <DayColumn
          v-for="date in dateRange"
          :key="date"
          :date="date"
          :meals="mealsStore.mealsByDate[date] ?? []"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useMealsStore } from '@/stores/meals'
import TimelineSelector from '@/components/TimelineSelector.vue'
import DayColumn from '@/components/DayColumn.vue'

const mealsStore = useMealsStore()

/** Returns ISO date strings for every day from start to end (inclusive). */
const dateRange = computed<string[]>(() => {
  const { start, end } = mealsStore.selectedRange
  if (!start || !end) return []
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  while (current <= endDate) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
})

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

onMounted(() => {
  const monday = getMonday(new Date())
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  mealsStore.setRange(toISODate(monday), toISODate(sunday))
  mealsStore.subscribeRealtime()
})

onUnmounted(() => {
  mealsStore.unsubscribeRealtime()
})
</script>
