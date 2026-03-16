<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div v-if="authStore.error" class="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
      {{ authStore.error }}
    </div>

    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        autocomplete="email"
        placeholder="you@example.com"
        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        autocomplete="current-password"
        placeholder="••••••••"
        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <button
      type="submit"
      :disabled="authStore.loading"
      class="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors"
    >
      <svg v-if="authStore.loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {{ mode === 'login' ? 'Sign in' : 'Create account' }}
    </button>

    <p class="text-center text-sm text-gray-500">
      <template v-if="mode === 'login'">
        Don't have an account?
        <button type="button" @click="switchMode" class="text-blue-600 hover:underline font-medium">Sign up</button>
      </template>
      <template v-else>
        Already have an account?
        <button type="button" @click="switchMode" class="text-blue-600 hover:underline font-medium">Sign in</button>
      </template>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const mode = ref<'login' | 'signup'>('login')

function switchMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
}

async function handleSubmit() {
  if (mode.value === 'login') {
    await authStore.login(email.value, password.value)
  } else {
    await authStore.signup(email.value, password.value)
  }

  if (!authStore.error && authStore.session) {
    router.push('/app/meals')
  }
}
</script>
