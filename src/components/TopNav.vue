<template>
  <div>
    <OfflineIndicator />
    <nav class="bg-surface border-b border-border px-4 flex items-center justify-between h-14">
      <div class="flex gap-1 overflow-x-auto min-w-0 scrollbar-hide">
        <RouterLink
          to="/app/meals"
          class="px-3 min-h-[44px] flex items-center rounded-md text-sm font-medium text-text-secondary hover:text-accent hover:bg-hover-bg transition-colors duration-150 whitespace-nowrap"
          active-class="nav-tab-active"
        >
          Meals
        </RouterLink>
        <RouterLink
          to="/app/groceries"
          class="px-3 min-h-[44px] flex items-center rounded-md text-sm font-medium text-text-secondary hover:text-accent hover:bg-hover-bg transition-colors duration-150 whitespace-nowrap"
          active-class="nav-tab-active"
        >
          Groceries
        </RouterLink>
        <RouterLink
          to="/app/pantry"
          class="px-3 min-h-[44px] flex items-center rounded-md text-sm font-medium text-text-secondary hover:text-accent hover:bg-hover-bg transition-colors duration-150 whitespace-nowrap"
          active-class="nav-tab-active"
        >
          Pantry
        </RouterLink>
        <RouterLink
          to="/app/following"
          class="px-3 min-h-[44px] flex items-center rounded-md text-sm font-medium text-text-secondary hover:text-accent hover:bg-hover-bg transition-colors duration-150 whitespace-nowrap"
          active-class="nav-tab-active"
        >
          Discover
        </RouterLink>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <span
          v-if="userEmail"
          data-testid="user-email"
          class="hidden sm:inline text-sm text-text-secondary px-2"
        >{{ userEmail }}</span>
        <button
          v-if="householdStore.ready"
          data-testid="invite-btn"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 text-text-secondary hover:text-accent transition-colors duration-150"
          title="Invite to household"
          @click="showInviteModal = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </button>
        <button
          data-testid="logout-btn"
          @click="logout"
          class="min-h-[44px] flex items-center px-2 text-sm text-text-secondary hover:text-danger transition-colors duration-150"
        >
          Logout
        </button>
      </div>
    </nav>

    <InviteCodeModal v-if="showInviteModal" @close="showInviteModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/stores/household'
import OfflineIndicator from '@/components/OfflineIndicator.vue'
import InviteCodeModal from '@/components/InviteCodeModal.vue'

const router = useRouter()
const householdStore = useHouseholdStore()
const userEmail = ref<string | null>(null)
const showInviteModal = ref(false)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userEmail.value = user?.email ?? null
})

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>
