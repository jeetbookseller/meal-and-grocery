<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
      :class="activePreset === 'this-week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      @click="selectThisWeek"
    >
      This Week
    </button>
    <button
      class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
      :class="activePreset === 'next-week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      @click="selectNextWeek"
    >
      Next Week
    </button>
    <button
      class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
      :class="activePreset === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      @click="selectCustom"
    >
      Custom Range
    </button>
    <template v-if="activePreset === 'custom'">
      <input
        v-model="customStart"
        type="date"
        class="border rounded px-2 py-1 text-sm"
        @change="applyCustomRange"
      />
      <span class="text-gray-400 text-sm">to</span>
      <input
        v-model="customEnd"
        type="date"
        class="border rounded px-2 py-1 text-sm"
        @change="applyCustomRange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMealsStore } from '@/stores/meals'

const mealsStore = useMealsStore()

type Preset = 'this-week' | 'next-week' | 'custom'
const activePreset = ref<Preset>('this-week')
const customStart = ref('')
const customEnd = ref('')

/** Returns the Monday of the week containing the given date (local time). */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun … 6=Sat
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

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function selectThisWeek() {
  activePreset.value = 'this-week'
  const monday = getMonday(new Date())
  mealsStore.setRange(toISODate(monday), toISODate(addDays(monday, 6)))
}

function selectNextWeek() {
  activePreset.value = 'next-week'
  const monday = addDays(getMonday(new Date()), 7)
  mealsStore.setRange(toISODate(monday), toISODate(addDays(monday, 6)))
}

function selectCustom() {
  activePreset.value = 'custom'
}

function applyCustomRange() {
  if (customStart.value && customEnd.value) {
    mealsStore.setRange(customStart.value, customEnd.value)
  }
}
</script>
