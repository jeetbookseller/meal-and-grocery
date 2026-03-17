<template>
  <div class="min-h-screen bg-background">
    <TopNav />

    <!-- Household init in progress -->
    <div
      v-if="!householdStore.ready && !householdStore.needsHousehold && householdStore.loading"
      class="flex items-center justify-center h-64"
    >
      <BaseSpinner />
    </div>

    <!-- Error state -->
    <div
      v-else-if="householdStore.error && !householdStore.ready && !householdStore.needsHousehold"
      class="flex items-center justify-center h-64"
    >
      <BaseErrorBanner :message="householdStore.error" />
    </div>

    <!-- Create or join household prompt -->
    <div
      v-else-if="householdStore.needsHousehold"
      class="flex items-center justify-center min-h-[calc(100vh-56px)] px-4"
    >
      <div class="card p-8 w-full max-w-sm">
        <h2 class="text-xl font-semibold text-text-primary mb-6">Get started</h2>

        <!-- Tabs -->
        <div class="flex rounded-md border border-border mb-6 overflow-hidden">
          <button
            type="button"
            :class="[
              'flex-1 min-h-[44px] text-sm font-medium transition-colors duration-150',
              activeTab === 'create'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-hover-bg',
            ]"
            @click="activeTab = 'create'"
          >
            Create household
          </button>
          <button
            type="button"
            :class="[
              'flex-1 min-h-[44px] text-sm font-medium transition-colors duration-150',
              activeTab === 'join'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-hover-bg',
            ]"
            @click="activeTab = 'join'"
          >
            Join household
          </button>
        </div>

        <!-- Create form -->
        <div v-if="activeTab === 'create'">
          <p class="text-sm text-text-secondary mb-4">Give your household a name to get started.</p>
          <form @submit.prevent="submitCreate" class="space-y-4">
            <input
              v-model="newHouseholdName"
              type="text"
              placeholder="e.g. Our Home"
              class="input"
              :disabled="householdStore.loading"
              required
            />
            <p v-if="householdStore.error" class="text-sm text-danger">{{ householdStore.error }}</p>
            <button
              type="submit"
              :disabled="householdStore.loading || !newHouseholdName.trim()"
              class="btn-primary w-full"
            >
              {{ householdStore.loading ? 'Creating...' : 'Create Household' }}
            </button>
          </form>
        </div>

        <!-- Join form -->
        <div v-else>
          <p class="text-sm text-text-secondary mb-4">Enter the invite code shared by your partner.</p>
          <form @submit.prevent="submitJoin" class="space-y-4">
            <input
              v-model="inviteCodeInput"
              type="text"
              placeholder="e.g. abc12345"
              class="input font-mono"
              :disabled="householdStore.loading"
              required
            />
            <p v-if="householdStore.error" class="text-sm text-danger">{{ householdStore.error }}</p>
            <button
              type="submit"
              :disabled="householdStore.loading || !inviteCodeInput.trim()"
              class="btn-primary w-full"
            >
              {{ householdStore.loading ? 'Joining...' : 'Join Household' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Invite code display (shown after creating a household) -->
    <div
      v-else-if="householdStore.justCreated && !inviteCodeDismissed"
      class="flex items-center justify-center min-h-[calc(100vh-56px)] px-4"
    >
      <div class="card p-8 w-full max-w-sm text-center">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-text-primary mb-2">Household created!</h2>
        <p class="text-sm text-text-secondary mb-6">Share this invite code with your partner so they can join.</p>
        <div class="bg-hover-bg rounded-lg px-6 py-4 mb-6 border border-border">
          <p class="text-2xl font-mono font-bold tracking-widest text-text-primary">
            {{ householdStore.inviteCode }}
          </p>
        </div>
        <button
          type="button"
          class="btn-primary w-full"
          @click="inviteCodeDismissed = true"
        >
          Continue to app
        </button>
      </div>
    </div>

    <!-- Main content — only when household is ready -->
    <main v-else-if="householdStore.ready" class="p-4">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHouseholdStore } from '@/stores/household'
import TopNav from '@/components/TopNav.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseErrorBanner from '@/components/base/BaseErrorBanner.vue'

const householdStore = useHouseholdStore()
const newHouseholdName = ref('')
const inviteCodeInput = ref('')
const activeTab = ref<'create' | 'join'>('create')
const inviteCodeDismissed = ref(false)

onMounted(() => {
  householdStore.init()
})

async function submitCreate() {
  if (!newHouseholdName.value.trim()) return
  await householdStore.createHousehold(newHouseholdName.value.trim())
}

async function submitJoin() {
  if (!inviteCodeInput.value.trim()) return
  await householdStore.joinHousehold(inviteCodeInput.value.trim())
}
</script>
