<template>
  <div class="flex flex-col gap-4 p-4">
    <TimelineSelector />
    <BaseSpinner v-if="mealsStore.loading" />
    <BaseErrorBanner v-else-if="mealsStore.error" :message="mealsStore.error" />
    <div v-else-if="dates.length === 0" class="text-center py-8" style="color: var(--color-text-muted)">
      No meals planned — add one below
    </div>
    <div v-else class="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-7">
      <DayColumn
        v-for="date in dates"
        :key="date"
        :date="date"
        :meals="mealsStore.mealsByDate[date] ?? []"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useMealsStore } from '@/stores/meals'
import TimelineSelector from '@/components/TimelineSelector.vue'
import DayColumn from '@/components/DayColumn.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

const mealsStore = useMealsStore()

const dates = computed(() => {
  const { start, end } = mealsStore.selectedRange
  if (!start || !end) return []
  const result: string[] = []
  const current = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (current <= endDate) {
    result.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return result
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
