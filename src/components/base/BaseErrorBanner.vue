<template>
  <div data-testid="base-error-banner" class="p-3 mb-4 bg-red-50 border border-danger/30 rounded-md text-sm text-danger">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
</script>
