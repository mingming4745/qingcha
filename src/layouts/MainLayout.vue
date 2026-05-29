<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabase } from '../composables/useSupabase'

const route = useRoute()
const router = useRouter()
const { supabase } = useSupabase()
const isCollapsed = ref(false)
const isMobile = ref(false)
const showMobileNav = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    isCollapsed.value = true
    showMobileNav.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const currentTitle = computed(() => {
  return (route.meta?.title as string) || '经营总览'
})

interface NavItem {
  path: string
  icon: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/app/dashboard', icon: 'Odometer', label: '经营总览' },
  { path: '/app/bookings', icon: 'Calendar', label: '预约管理' },
  { path: '/app/bookings/calendar', icon: 'Date', label: '预约日历' },
  { path: '/app/customers', icon: 'User', label: '会员管理' },
  { path: '/app/inventory', icon: 'Box', label: '库存管理' },
  { path: '/app/reports', icon: 'DataAnalysis', label: '营业报表' },
  { path: '/app/settings', icon: 'Setting', label: '基础设置' },
]

function navigateTo(path: string) {
  router.push(path)
  showMobileNav.value = false
}

function toggleSidebar() {
  if (isMobile.value) {
    showMobileNav.value = !showMobileNav.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <!-- 移动端遮罩 -->
    <div v-if="isMobile && showMobileNav" class="mobile-overlay" @click="showMobileNav = false" />

    <!-- 侧边栏 - 玻璃质感 -->
    <aside class="sidebar glass-panel" :class="{ collapsed: isCollapsed && !isMobile, 'mobile-open': isMobile && showMobileNav }">
      <!-- 品牌 -->
      <div class="sidebar-brand" @click="navigateTo('/app/dashboard')">
        <div class="brand-icon">
          <svg width="24" height="24" viewBox="0 0 512 512" fill="#fff" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(1 1)">
              <path d="M221.629,74.886C207.914,88.6,200.6,102.314,200.6,116.943s7.314,29.257,21.029,43.886c1.829,1.829,3.657,2.743,6.4,2.743c1.829,0,4.571-0.914,6.4-2.743c3.657-3.657,3.657-9.143,0-12.8c-10.057-10.971-15.543-21.029-15.543-31.086s5.486-20.114,15.543-29.257c13.714-12.8,21.029-27.429,21.029-42.057c0-15.543-6.4-30.171-21.029-43.886c-3.657-3.657-9.143-3.657-12.8,0c-3.657,3.657-3.657,9.143,0,12.8c10.057,10.971,15.543,21.029,15.543,31.086C237.171,55.686,231.686,65.743,221.629,74.886z"/>
              <path d="M301.171,116.943c0,14.629,7.314,29.257,21.029,43.886c1.829,1.829,3.657,2.743,6.4,2.743c1.829,0,4.571-0.914,5.486-2.743c3.657-3.657,3.657-9.143,0-12.8c-10.057-10.971-15.543-21.029-15.543-31.086s5.486-20.114,15.543-29.257c14.629-12.8,21.943-27.429,21.943-42.057c0-15.543-7.314-30.171-21.029-43.886c-3.657-3.657-9.143-3.657-12.8,0s-3.657,9.143,0,12.8c10.057,10.971,15.543,21.029,15.543,31.086c0,10.057-5.486,19.2-15.543,29.257C308.486,88.6,301.171,102.314,301.171,116.943z"/>
              <path d="M109.171,116.943c0,14.629,7.314,29.257,21.029,43.886c1.829,1.829,3.657,2.743,6.4,2.743c1.829,0,4.571-0.914,5.486-2.743c3.657-3.657,3.657-9.143,0-12.8c-10.057-10.971-15.543-21.029-15.543-31.086s5.486-20.114,15.543-29.257c14.629-12.8,21.943-27.429,21.943-42.057c0-15.543-7.314-30.171-21.029-43.886c-3.657-3.657-9.143-3.657-12.8,0c-3.657,3.657-3.657,9.143,0,12.8c10.057,10.971,15.543,21.029,15.543,31.086c0,10.057-5.486,19.2-15.543,29.257C116.486,88.6,109.171,102.314,109.171,116.943z"/>
              <path d="M175,428.714c-64.914-10.971-97.829-47.543-111.543-120.686c-0.914-4.571-6.4-8.229-10.971-7.314s-8.229,6.4-7.314,10.971C59.8,393.057,99.114,434.2,171.343,447c0.914,0,0.914,0,1.829,0c4.571,0,8.229-2.743,9.143-7.314C183.229,434.2,179.571,429.629,175,428.714z"/>
            </g>
          </svg>
        </div>
        <transition name="fade">
          <span v-if="!isCollapsed || (isMobile && showMobileNav)" class="brand-name">清茶</span>
        </transition>
      </div>

      <!-- 导航 -->
      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path || route.path.startsWith(item.path + '/') }"
          @click="navigateTo(item.path)"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
          <transition name="fade">
            <span v-if="!isCollapsed || (isMobile && showMobileNav)" class="nav-label">{{ item.label }}</span>
          </transition>
        </button>
      </nav>

      <!-- 登出 -->
      <button class="nav-item logout-btn" @click="handleLogout">
        <el-icon :size="20"><SwitchButton /></el-icon>
        <transition name="fade">
          <span v-if="!isCollapsed || (isMobile && showMobileNav)" class="nav-label">退出登录</span>
        </transition>
      </button>

      <!-- 折叠按钮 (桌面端) -->
      <button v-if="!isMobile" class="sidebar-toggle" @click="toggleSidebar">
        <el-icon :size="18">
          <component :is="isCollapsed ? 'Expand' : 'Fold'" />
        </el-icon>
      </button>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 页面头部 - 杂志感 -->
      <header class="page-header">
        <div class="header-left">
          <button v-if="isMobile" class="mobile-menu-btn" @click="toggleSidebar">
            <el-icon :size="22"><Expand /></el-icon>
          </button>
          <div>
            <h1 class="page-title">{{ currentTitle }}</h1>
            <p class="page-subtitle">清茶茶馆经营管理</p>
          </div>
        </div>
        <div class="header-right">
          <el-text class="text-muted" size="small">
            {{ new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
          </el-text>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="page-body">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 移动端底部导航 -->
    <nav v-if="isMobile" class="bottom-nav">
      <button
        v-for="item in navItems.slice(0, 5)"
        :key="item.path"
        class="bottom-nav-item"
        :class="{ active: route.path === item.path || route.path.startsWith(item.path + '/') }"
        @click="navigateTo(item.path)"
      >
        <el-icon :size="20"><component :is="item.icon" /></el-icon>
        <span class="bottom-nav-label">{{ item.label }}</span>
      </button>
      <button class="bottom-nav-item" @click="showMobileNav = true">
        <el-icon :size="20"><More /></el-icon>
        <span class="bottom-nav-label">更多</span>
      </button>
    </nav>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

// ─── 侧边栏 ───
.sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  border-radius: 0;
  border-left: none;
  border-top: none;
  border-bottom: none;
  transition: width $duration-normal $ease-apple;
  overflow: hidden;

  &.collapsed {
    width: 72px;
  }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 24px;
  cursor: pointer;
  border-radius: $radius-sm;
  transition: background $duration-fast $ease-standard;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(145deg, $accent, $accent-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.25);
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: $text;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

// ─── 导航 ───
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: $radius-sm;
  cursor: pointer;
  font-family: $font-sans;
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
  transition: all $duration-fast $ease-standard;
  white-space: nowrap;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    color: $text;
  }

  &.active {
    background: rgba(52, 211, 153, 0.08);
    color: $accent-deep;

    .el-icon {
      color: $accent-deep;
    }
  }
}

.nav-label {
  white-space: nowrap;
}

.logout-btn {
  color: $text-muted;
  margin-top: 4px;

  &:hover {
    color: $danger;
    background: rgba(239, 68, 68, 0.06);
  }
}

// ─── 折叠按钮 ───
.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: auto;
  border: none;
  background: transparent;
  border-radius: $radius-xs;
  cursor: pointer;
  color: $text-muted;
  transition: all $duration-fast $ease-standard;
  align-self: center;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    color: $text-secondary;
  }
}

// ─── 主内容区 ───
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

// ─── 页面头部 - 杂志感排版 ───
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 32px 40px 24px;
  flex-shrink: 0;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: $text;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: $text-muted;
  margin-top: 4px;
  letter-spacing: 0.02em;
}

.header-right {
  flex-shrink: 0;
}

// ─── 页面内容 ───
.page-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 40px 40px;
}

// ─── 过渡动画 - 克制 ───
.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-fast $ease-standard;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.page-fade-enter-active {
  transition: opacity $duration-normal $ease-apple, transform $duration-normal $ease-apple;
}
.page-fade-leave-active {
  transition: opacity $duration-fast $ease-standard;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-fade-leave-to {
  opacity: 0;
}

// ─── 移动端适配 ───
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
  backdrop-filter: blur(2px);
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: $radius-sm;
  cursor: pointer;
  color: $text;
  transition: background $duration-fast $ease-standard;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
}

// ─── 底部导航 ───
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding: 4px 0 env(safe-area-inset-bottom, 0);
  z-index: 100;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: $text-muted;
  font-family: $font-sans;
  transition: color $duration-fast $ease-standard;

  &.active {
    color: $accent-deep;
  }
}

.bottom-nav-label {
  font-size: 10px;
  font-weight: 500;
}

// ─── 响应式断点 ───
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: -260px;
    top: 0;
    bottom: 0;
    width: 260px;
    z-index: 100;
    transition: left $duration-normal $ease-apple;

    &.mobile-open {
      left: 0;
    }
  }

  .page-header {
    padding: 16px 20px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-body {
    padding: 0 16px 100px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar {
    width: 72px;

    .brand-name,
    .nav-label {
      display: none;
    }
  }

  .page-header {
    padding: 24px 24px 20px;
  }

  .page-body {
    padding: 0 24px 24px;
  }
}
</style>
