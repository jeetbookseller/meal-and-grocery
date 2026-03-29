import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/app/meals',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/app',
      component: () => import('@/views/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'meals',
          name: 'meals',
          component: () => import('@/views/MealPlanView.vue'),
        },
        {
          path: 'groceries',
          name: 'groceries',
          component: () => import('@/views/GroceryListView.vue'),
        },
        {
          path: 'pantry',
          name: 'pantry',
          component: () => import('@/views/PantryListView.vue'),
        },
        {
          path: '',
          redirect: 'meals',
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/app/meals',
    },
  ],
})

router.beforeEach(async (to) => {
  const { data } = await supabase.auth.getSession()
  const isAuthenticated = !!data.session

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: 'meals' }
  }
})

export default router
