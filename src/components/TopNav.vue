<template>
  <nav class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <div class="flex gap-1">
      <RouterLink
        to="/app/meals"
        class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        active-class="text-blue-600 bg-blue-50"
      >
        Meals
      </RouterLink>
      <RouterLink
        to="/app/groceries"
        class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        active-class="text-blue-600 bg-blue-50"
      >
        Groceries
      </RouterLink>
    </div>
    <div class="flex items-center gap-3">
      <span v-if="userEmail" class="text-sm text-gray-500 truncate max-w-[200px]">{{ userEmail }}</span>
      <button
        @click="logout"
        class="text-sm text-gray-600 hover:text-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const userEmail = ref<string | null>(null)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userEmail.value = user?.email ?? null
})

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>
