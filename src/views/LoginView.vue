<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full p-8 bg-white rounded-lg shadow">
      <h1 class="text-2xl font-bold text-center mb-2">Meal Planner</h1>
      <p class="text-center text-gray-500 text-sm mb-6">Plan meals and manage groceries together</p>
      <AuthForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import AuthForm from '@/components/AuthForm.vue'
</script>
