<template>
  <div data-testid="base-error-banner" class="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
</script>
