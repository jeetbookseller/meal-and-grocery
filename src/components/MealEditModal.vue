<template>
  <!-- TASK-09: full implementation -->
  <div />
</template>

<script setup lang="ts">
import type { Meal } from '@/types/database'
defineProps<{ meal: Meal }>()
defineEmits<{ close: [] }>()
</script>
