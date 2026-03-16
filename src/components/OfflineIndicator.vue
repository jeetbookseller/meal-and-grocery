<template>
  <div
    v-if="isOffline"
    data-testid="offline-banner"
    class="fixed top-0 inset-x-0 bg-yellow-400 text-yellow-900 text-sm text-center py-1 z-50"
  >
    You are offline — changes will sync when reconnected
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOffline = ref(!navigator.onLine)

function handleOffline() {
  isOffline.value = true
}

function handleOnline() {
  isOffline.value = false
}

onMounted(() => {
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
})

onUnmounted(() => {
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online', handleOnline)
})
</script>
