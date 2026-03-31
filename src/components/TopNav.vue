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
      <div class="relative shrink-0">
        <button
          data-testid="menu-btn"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 text-text-secondary hover:text-accent transition-colors duration-150"
          title="Menu"
          @click="showMenu = !showMenu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <!-- Backdrop to close menu on outside click -->
        <div
          v-if="showMenu"
          class="fixed inset-0 z-10"
          @click="showMenu = false"
        />

        <!-- Dropdown menu -->
        <div
          v-if="showMenu"
          class="absolute right-0 mt-1 w-56 bg-surface border border-border rounded-md shadow-lg z-20"
        >
          <div v-if="userEmail" class="px-4 py-2 text-sm text-text-secondary border-b border-border truncate" data-testid="user-email">
            {{ userEmail }}
          </div>
          <button
            v-if="householdStore.ready"
            data-testid="invite-btn"
            class="w-full min-h-[44px] flex items-center gap-2 px-4 text-sm text-text-primary hover:bg-hover-bg transition-colors duration-150"
            @click="showInviteModal = true; showMenu = false"
          >
            <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite to household
          </button>
          <button
            data-testid="logout-btn"
            class="w-full min-h-[44px] flex items-center gap-2 px-4 text-sm text-text-secondary hover:text-danger hover:bg-hover-bg transition-colors duration-150"
            @click="logout"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
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
const showMenu = ref(false)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userEmail.value = user?.email ?? null
})

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>
