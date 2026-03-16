<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white border-b border-gray-200 px-4 py-3 flex gap-4">
      <RouterLink to="/app/meals" class="font-medium text-gray-700 hover:text-blue-600">Meals</RouterLink>
      <RouterLink to="/app/groceries" class="font-medium text-gray-700 hover:text-blue-600">Groceries</RouterLink>
    </nav>
    <!-- TopNav + household init implemented in TASK-04 -->
    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>
