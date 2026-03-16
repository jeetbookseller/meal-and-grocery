<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      data-testid="modal-backdrop"
      class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 class="text-lg font-semibold text-gray-900">Invite to household</h2>
          <button
            data-testid="close-btn"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            @click="$emit('close')"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5">
          <p class="text-sm text-gray-500 mb-4">
            Share this code with your partner. They can enter it on the "Join household" screen after signing up.
          </p>

          <!-- Invite code display + copy -->
          <div class="flex items-center gap-2 mb-5">
            <div class="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-center">
              <span class="text-2xl font-mono font-bold tracking-widest text-gray-900">
                {{ householdStore.inviteCode }}
              </span>
            </div>
            <button
              data-testid="copy-btn"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              :title="copied ? 'Copied!' : 'Copy to clipboard'"
              @click="copyCode"
            >
              <span v-if="copied" class="text-green-600 font-medium text-xs">Copied!</span>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <!-- Error -->
          <p v-if="householdStore.error" class="text-sm text-red-600 mb-4">
            {{ householdStore.error }}
          </p>

          <!-- Regenerate -->
          <button
            data-testid="regenerate-btn"
            class="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            :disabled="householdStore.loading"
            @click="householdStore.regenerateInviteCode()"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ householdStore.loading ? 'Regenerating...' : 'Generate new code' }}
          </button>
          <p class="text-xs text-gray-400 mt-2 text-center">
            This will invalidate the current code.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHouseholdStore } from '@/stores/household'

defineEmits<{ close: [] }>()

const householdStore = useHouseholdStore()
const copied = ref(false)

async function copyCode() {
  if (!householdStore.inviteCode) return
  await navigator.clipboard.writeText(householdStore.inviteCode)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
