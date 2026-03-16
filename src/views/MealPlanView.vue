<template>
  <div>
    <TimelineSelector />
    <BaseSpinner v-if="mealsStore.loading" />
    <BaseErrorBanner v-else-if="mealsStore.error" :message="mealsStore.error" />
    <MealListView v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMealsStore } from '@/stores/meals'
import TimelineSelector from '@/components/TimelineSelector.vue'
import MealListView from '@/components/MealListView.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

const mealsStore = useMealsStore()

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
