<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div v-if="authStore.error" data-testid="auth-error" class="p-3 rounded-md bg-red-50 border border-danger/30 text-danger text-sm">
      {{ authStore.error }}
    </div>

    <div>
      <label for="email" class="block text-sm font-medium text-text-primary mb-1">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        autocomplete="email"
        placeholder="you@example.com"
        class="input"
      />
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-text-primary mb-1">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        autocomplete="current-password"
        placeholder="••••••••"
        class="input"
      />
    </div>

    <button
      type="submit"
      :disabled="authStore.loading"
      class="btn-primary w-full gap-2"
    >
      <svg v-if="authStore.loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {{ mode === 'login' ? 'Sign in' : 'Create account' }}
    </button>

    <p class="text-center text-sm text-text-secondary">
      <template v-if="mode === 'login'">
        Don't have an account?
        <button type="button" @click="switchMode" class="text-accent hover:underline font-medium">Sign up</button>
      </template>
      <template v-else>
        Already have an account?
        <button type="button" @click="switchMode" class="text-accent hover:underline font-medium">Sign in</button>
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
