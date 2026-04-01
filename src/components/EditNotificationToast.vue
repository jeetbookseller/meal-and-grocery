<template>
  <Transition name="toast">
    <div
      v-if="notification.visible"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1F1F1E] text-white rounded-lg shadow-lg px-4 py-3 max-w-xs w-max"
      role="status"
      aria-live="polite"
    >
      <span class="text-sm">{{ notification.message }}</span>
      <button
        @click="dismiss"
        class="text-white/60 hover:text-white ml-1 text-base leading-none min-w-[24px] min-h-[24px] flex items-center justify-center"
        aria-label="Dismiss notification"
      >×</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useEditNotification } from '@/composables/useEditNotification'

const { notification, dismiss } = useEditNotification()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
.toast-enter-to,
.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
