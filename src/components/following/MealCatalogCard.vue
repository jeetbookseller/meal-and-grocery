<template>
  <div
    class="card p-4 flex flex-col gap-2 transition-all duration-150"
    :class="[
      score >= 0.5 ? 'border-green-400' : score > 0 ? 'border-amber-400' : '',
      fridgeActive && score === 0 ? 'opacity-40' : '',
    ]"
  >
    <!-- Top row: emoji + badges -->
    <div class="flex items-start justify-between gap-2">
      <span class="text-2xl leading-none">{{ meal.emoji }}</span>
      <div class="flex flex-wrap gap-1 justify-end">
        <span
          v-if="score >= 0.5"
          class="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap"
        >COOK NOW</span>
        <span
          v-else-if="score > 0"
          class="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap"
        >partial match</span>
        <span
          v-if="meal.household_id !== null"
          class="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full whitespace-nowrap"
        >MY RECIPE</span>
      </div>
    </div>

    <!-- Name -->
    <h3 class="font-semibold text-text-primary text-sm leading-snug">{{ meal.name }}</h3>

    <!-- Meta badges -->
    <div class="flex flex-wrap gap-1.5 items-center">
      <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', categoryClass]">
        {{ categoryLabel }}
      </span>
      <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', proteinClass]">
        {{ proteinLabel }} protein
      </span>
      <span class="text-xs text-text-muted">⏱ {{ meal.cook_time }}</span>
    </div>

    <!-- Description -->
    <p v-if="meal.description" class="text-xs text-text-secondary leading-snug">
      {{ meal.description }}
    </p>

    <!-- Matched ingredients -->
    <div v-if="matched.length > 0" class="text-xs text-green-700 font-medium">
      ✓ {{ matched.join(', ') }}
    </div>

    <!-- Tags -->
    <div class="flex flex-wrap gap-1 mt-auto pt-1">
      <span
        v-for="tag in meal.tags"
        :key="tag"
        class="text-xs text-text-muted bg-hover-bg px-1.5 py-0.5 rounded"
      >{{ tag }}</span>
    </div>

    <!-- Edit / Delete (custom meals only) -->
    <div v-if="meal.household_id !== null" class="flex gap-1 pt-1 border-t border-border mt-1">
      <button
        class="btn-ghost text-xs min-h-[36px] px-2 flex-1"
        @click="$emit('edit', meal)"
      >Edit</button>
      <button
        class="btn-ghost text-xs min-h-[36px] px-2 flex-1 hover:text-danger"
        @click="$emit('delete', meal)"
      >Delete</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MealCatalogItem } from '@/types/database'

const props = defineProps<{
  meal: MealCatalogItem & { score: number; matched: string[] }
  fridgeActive: boolean
}>()

defineEmits<{
  edit: [meal: MealCatalogItem]
  delete: [meal: MealCatalogItem]
}>()

const score = computed(() => props.meal.score)
const matched = computed(() => props.meal.matched)

const categoryLabel = computed(() => ({
  low: 'Low Energy',
  medium: 'Medium',
  high: 'High Energy',
  onepot: 'One Pot',
}[props.meal.category]))

const categoryClass = computed(() => ({
  low: 'text-accent bg-accent/10',
  medium: 'text-amber-700 bg-amber-100',
  high: 'text-orange-700 bg-orange-100',
  onepot: 'text-teal-700 bg-teal-100',
}[props.meal.category]))

const proteinLabel = computed(() => ({
  high: 'High',
  medium: 'Med',
  low: 'Low',
}[props.meal.protein]))

const proteinClass = computed(() => ({
  high: 'text-green-700 bg-green-100',
  medium: 'text-amber-700 bg-amber-100',
  low: 'text-text-muted bg-hover-bg',
}[props.meal.protein]))
</script>
