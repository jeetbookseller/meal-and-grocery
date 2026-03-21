<template>
  <!-- Signup success: email confirmation pending -->
  <div v-if="authStore.signupPendingConfirmation" class="space-y-4 text-center">
    <div class="p-3 rounded-md bg-accent/10 border border-accent/30 text-accent text-sm">
      Signup successful! Please check your email and click the confirmation link.
    </div>
    <p class="text-sm text-text-secondary">
      Once confirmed, come back and
      <button type="button" @click="backToLogin" class="text-accent hover:underline font-medium">sign in</button>.
    </p>
  </div>

  <!-- Main form -->
  <form v-else @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Email confirmed banner -->
    <div v-if="authStore.emailConfirmed" class="p-3 rounded-md bg-accent/10 border border-accent/30 text-accent text-sm">
      Email confirmed! Please sign in.
    </div>

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
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        placeholder="••••••••"
        class="input"
      />
      <!-- Password requirements indicator (signup only) -->
      <div v-if="mode === 'signup'" class="mt-1.5 space-y-0.5 text-xs">
        <div v-for="req in [
          { met: passwordMeetsLength, label: 'At least 15 characters' },
          { met: passwordHasLowercase, label: 'A lowercase letter' },
          { met: passwordHasUppercase, label: 'An uppercase letter' },
          { met: passwordHasDigit, label: 'A digit' },
          { met: passwordHasSymbol, label: 'A symbol' },
        ]" :key="req.label" class="flex items-center gap-1.5">
          <svg v-if="req.met" class="h-3.5 w-3.5 text-accent shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span v-else class="h-3.5 w-3.5 flex items-center justify-center text-text-muted shrink-0">&#x2022;</span>
          <span :class="req.met ? 'text-accent' : 'text-text-muted'">{{ req.label }}</span>
        </div>
      </div>
    </div>

    <!-- Confirm password (signup only) -->
    <div v-if="mode === 'signup'">
      <label for="confirm-password" class="block text-sm font-medium text-text-primary mb-1">Confirm password</label>
      <input
        id="confirm-password"
        v-model="confirmPassword"
        type="password"
        required
        autocomplete="new-password"
        placeholder="••••••••"
        class="input"
      />
      <div v-if="confirmPassword.length > 0" class="mt-1.5 flex items-center gap-1.5 text-xs">
        <svg v-if="confirmPassword === password" class="h-3.5 w-3.5 text-accent shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span v-else class="h-3.5 w-3.5 flex items-center justify-center text-danger shrink-0">&#x2022;</span>
        <span :class="confirmPassword === password ? 'text-accent' : 'text-danger'">
          {{ confirmPassword === password ? 'Passwords match' : 'Passwords do not match' }}
        </span>
      </div>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const mode = ref<'login' | 'signup'>('login')

const passwordMeetsLength = computed(() => password.value.length >= 15)
const passwordHasLowercase = computed(() => /[a-z]/.test(password.value))
const passwordHasUppercase = computed(() => /[A-Z]/.test(password.value))
const passwordHasDigit = computed(() => /\d/.test(password.value))
const passwordHasSymbol = computed(() => /[^a-zA-Z0-9]/.test(password.value))
const passwordMeetsAll = computed(
  () => passwordMeetsLength.value && passwordHasLowercase.value && passwordHasUppercase.value && passwordHasDigit.value && passwordHasSymbol.value
)
const showMismatchError = computed(
  () => mode.value === 'signup' && confirmPassword.value.length > 0 && confirmPassword.value !== password.value
)

function switchMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  confirmPassword.value = ''
  authStore.error = null
  authStore.signupPendingConfirmation = false
}

function backToLogin() {
  mode.value = 'login'
  confirmPassword.value = ''
  authStore.signupPendingConfirmation = false
  authStore.error = null
}

async function handleSubmit() {
  if (mode.value === 'login') {
    await authStore.login(email.value, password.value)
    if (!authStore.error && authStore.session) {
      router.push('/app/meals')
    }
  } else {
    if (!passwordMeetsAll.value) {
      authStore.error = 'Password must be at least 15 characters and include a lowercase letter, uppercase letter, digit, and symbol'
      return
    }
    if (confirmPassword.value !== password.value) {
      authStore.error = 'Passwords do not match'
      return
    }
    await authStore.signup(email.value, password.value)
    // If auto-confirmed (no email verification required), redirect
    if (!authStore.error && authStore.session) {
      router.push('/app/meals')
    }
    // Otherwise signupPendingConfirmation banner will show
  }
}
</script>
