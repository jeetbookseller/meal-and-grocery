<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
      :class="activePreset === 'this-week' ? 'btn-primary' : 'btn-ghost'"
      @click="selectThisWeek"
    >
      This Week
    </button>
    <button
      class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
      :class="activePreset === 'next-week' ? 'btn-primary' : 'btn-ghost'"
      @click="selectNextWeek"
    >
      Next Week
    </button>
    <button
      class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
      :class="activePreset === 'custom' ? 'btn-primary' : 'btn-ghost'"
      @click="selectCustom"
    >
      Custom Range
    </button>
    <template v-if="activePreset === 'custom'">
      <input
        v-model="customStart"
        type="date"
        class="input w-auto"
        @change="applyCustomRange"
      />
      <span class="text-sm" style="color: var(--color-text-muted)">to</span>
      <input
        v-model="customEnd"
        type="date"
        class="input w-auto"
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
