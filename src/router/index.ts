import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSupabase } from '../composables/useSupabase'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/app',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/app/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '经营总览', requiresAuth: true },
      },
      {
        path: 'bookings',
        name: 'Bookings',
        component: () => import('../views/Bookings.vue'),
        meta: { title: '预约管理', requiresAuth: true },
      },
      {
        path: 'bookings/calendar',
        name: 'BookingCalendar',
        component: () => import('../views/BookingCalendar.vue'),
        meta: { title: '预约日历', requiresAuth: true },
      },
      {
        path: 'bookings/:id',
        name: 'BookingDetail',
        component: () => import('../views/BookingDetail.vue'),
        meta: { title: '订单详情', requiresAuth: true },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('../views/Customers.vue'),
        meta: { title: '会员管理', requiresAuth: true },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('../views/Inventory.vue'),
        meta: { title: '库存管理', requiresAuth: true },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/Reports.vue'),
        meta: { title: '营业报表', requiresAuth: true },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '基础设置', requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫 - 检查 Supabase 认证状态
const { supabase } = useSupabase()

router.beforeEach(async (to, _from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (to.meta.requiresAuth && !session) {
    next('/login')
  } else if (to.path === '/login' && session) {
    next('/app/dashboard')
  } else {
    next()
  }
})

export default router
