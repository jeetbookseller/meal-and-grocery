<template>
  <div class="min-h-screen bg-gray-50">
    <TopNav />

    <!-- Household init in progress -->
    <div
      v-if="!householdStore.ready && !householdStore.needsHousehold && householdStore.loading"
      class="flex items-center justify-center h-64"
    >
      <span class="text-gray-500">Loading...</span>
    </div>

    <!-- Error state -->
    <div
      v-else-if="householdStore.error && !householdStore.ready && !householdStore.needsHousehold"
      class="flex items-center justify-center h-64"
    >
      <p class="text-red-600">{{ householdStore.error }}</p>
    </div>

    <!-- Create household prompt -->
    <div
      v-else-if="householdStore.needsHousehold"
      class="flex items-center justify-center min-h-[calc(100vh-56px)]"
    >
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h2 class="text-xl font-semibold text-gray-900 mb-1">Create your household</h2>
        <p class="text-sm text-gray-500 mb-6">Give your household a name to get started.</p>

        <form @submit.prevent="submitCreate">
          <input
            v-model="newHouseholdName"
            type="text"
            placeholder="e.g. Our Home"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            :disabled="householdStore.loading"
            required
          />
          <p v-if="householdStore.error" class="text-sm text-red-600 mb-4">{{ householdStore.error }}</p>
          <button
            type="submit"
            :disabled="householdStore.loading || !newHouseholdName.trim()"
            class="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ householdStore.loading ? 'Creating...' : 'Create Household' }}
          </button>
        </form>
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

const householdStore = useHouseholdStore()
const newHouseholdName = ref('')

onMounted(() => {
  householdStore.init()
})

async function submitCreate() {
  if (!newHouseholdName.value.trim()) return
  await householdStore.createHousehold(newHouseholdName.value.trim())
}
</script>
