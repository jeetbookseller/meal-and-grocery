import { ref } from 'vue'

const COOLDOWN_MS = 180_000 // 3 minutes
const AUTO_DISMISS_MS = 4_000

// Module-level singletons — all stores share one cooldown timer
let lastNotifiedAt = 0
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const notification = ref<{ message: string; visible: boolean }>({
  message: '',
  visible: false,
})

function notify(message: string) {
  const now = Date.now()
  if (now - lastNotifiedAt < COOLDOWN_MS) return // in cooldown — suppress

  lastNotifiedAt = now
  notification.value.message = message
  notification.value.visible = true

  if (dismissTimer) clearTimeout(dismissTimer)
  dismissTimer = setTimeout(() => {
    notification.value.visible = false
  }, AUTO_DISMISS_MS)
}

function dismiss() {
  notification.value.visible = false
  // does NOT reset lastNotifiedAt — cooldown continues
}

export function useEditNotification() {
  return { notification, notify, dismiss }
}
