<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="card max-w-md w-full p-8 mx-4">
      <h1 class="text-2xl font-bold text-center text-text-primary mb-2">Meal Planner</h1>
      <p class="text-center text-text-secondary text-sm mb-6">Plan meals and manage groceries together</p>
      <AuthForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import AuthForm from '@/components/AuthForm.vue'
</script>
