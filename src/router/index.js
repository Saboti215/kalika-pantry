import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useHouseholdStore } from '../stores/household'

// Hash mode avoids needing a server-side rewrite rule, which GitHub Pages
// (a static file host) can't provide.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'scan',
      component: () => import('../views/ScanView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/OnboardingView.vue'),
    },
    {
      path: '/bestand',
      name: 'stock',
      component: () => import('../views/StockView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (!auth.isAuthenticated) {
    return to.name === 'login' ? true : { name: 'login' }
  }

  if (to.name === 'login') {
    return { name: 'scan' }
  }

  const household = useHouseholdStore()
  await household.ensureLoaded()

  if (!household.hasHousehold && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }

  if (household.hasHousehold && to.name === 'onboarding') {
    return { name: 'scan' }
  }

  return true
})

export default router
