<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '../composables/useSupabase'

const router = useRouter()
const { supabase } = useSupabase()

const activeTab = ref<'account' | 'sms'>('account')
const accountInput = ref('')
const passwordInput = ref('')
const phoneInput = ref('')
const codeInput = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const isLoading = ref(false)
const loginSuccess = ref(false)
const toastVisible = ref(false)
const toastType = ref<'error' | 'success' | 'info'>('info')
const toastMessage = ref('')
const codeSent = ref(false)
const codeCountdown = ref(60)

const videoLoaded = ref(false)
const posterHidden = ref(false)

// Scroll painting animation state
type CardState = 'hidden' | 'expanding' | 'expanded' | 'collapsing' | 'scrolling-up' | 'line-fade'
const cardState = ref<CardState>('hidden')
const brandExpanded = ref(false)

let toastTimer: ReturnType<typeof setTimeout>
let codeTimer: ReturnType<typeof setInterval>

function showToast(type: 'error' | 'success' | 'info', msg: string) {
  toastType.value = type
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2500)
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function sendCode() {
  if (!phoneInput.value || phoneInput.value.length !== 11) {
    showToast('error', '请先输入 11 位手机号')
    return
  }
  codeSent.value = true
  codeCountdown.value = 60
  showToast('success', '验证码已发送至 ' + phoneInput.value)
  codeTimer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(codeTimer)
      codeSent.value = false
    }
  }, 1000)
}

async function handleAccountLogin(e: Event) {
  e.preventDefault()
  if (!accountInput.value) { showToast('error', '请输入邮箱'); return }
  if (!passwordInput.value) { showToast('error', '请输入密码'); return }
  if (passwordInput.value.length < 6) { showToast('error', '密码长度不能少于 6 位'); return }
  isLoading.value = true
  try {
    const { error: err } = await supabase.auth.signInWithPassword({
      email: accountInput.value,
      password: passwordInput.value,
    })
    if (err) {
      isLoading.value = false
      showToast('error', err.message === 'Invalid login credentials' ? '邮箱或密码错误' : err.message)
      return
    }
    loginSuccess.value = true
    showToast('success', '欢迎回来！')
    setTimeout(() => { router.push('/app/dashboard') }, 800)
  } catch {
    isLoading.value = false
    showToast('error', '登录失败，请检查网络连接')
  }
}

function handleSmsLogin(e: Event) {
  e.preventDefault()
  if (!phoneInput.value) { showToast('error', '请输入手机号'); return }
  if (phoneInput.value.length !== 11) { showToast('error', '请输入 11 位手机号'); return }
  if (!codeInput.value) { showToast('error', '请输入验证码'); return }
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    loginSuccess.value = true
    showToast('success', '欢迎回来！')
    setTimeout(() => { router.push('/app/dashboard') }, 800)
  }, 1200)
}

// ─── Scroll Painting Animation ───
let expandTimeout1: ReturnType<typeof setTimeout> | undefined
let expandTimeout2: ReturnType<typeof setTimeout> | undefined
let collapseTimeout1: ReturnType<typeof setTimeout> | undefined
let collapseTimeout2: ReturnType<typeof setTimeout> | undefined
let collapseTimeout3: ReturnType<typeof setTimeout> | undefined
let collapseTimeout4: ReturnType<typeof setTimeout> | undefined

function expand() {
  if (cardState.value !== 'hidden' && cardState.value !== 'line-fade') return
  brandExpanded.value = true
  cardState.value = 'expanding'
  expandTimeout1 = setTimeout(() => {
    cardState.value = 'expanded'
  }, 380)
}

function collapse() {
  if (cardState.value !== 'expanded') return
  // Phase 1: content retracts (stagger out)
  cardState.value = 'collapsing'
  // Phase 2: scroll painting collapse (card -> thin line)
  collapseTimeout1 = setTimeout(() => {
    cardState.value = 'scrolling-up'
  }, 180)
  // Phase 3: thin line fades out
  collapseTimeout2 = setTimeout(() => {
    cardState.value = 'line-fade'
  }, 550)
  // Phase 4: reset to hidden, restore brand
  collapseTimeout3 = setTimeout(() => {
    cardState.value = 'hidden'
    brandExpanded.value = false
  }, 780)
}

function toggleCard() {
  if (cardState.value === 'expanded') {
    collapse()
  } else if (cardState.value === 'hidden' || cardState.value === 'line-fade') {
    expand()
  }
}

onMounted(() => {
  const video = document.querySelector('#heroVideo') as HTMLVideoElement
  if (video) {
    video.addEventListener('canplay', () => {
      videoLoaded.value = true
      setTimeout(() => { posterHidden.value = true }, 800)
    })
  }
  // Auto-expand on page load so user sees the form immediately
  setTimeout(() => { expand() }, 300)
})

onUnmounted(() => {
  clearTimeout(toastTimer)
  clearInterval(codeTimer)
  clearTimeout(expandTimeout1)
  clearTimeout(expandTimeout2)
  clearTimeout(collapseTimeout1)
  clearTimeout(collapseTimeout2)
  clearTimeout(collapseTimeout3)
  clearTimeout(collapseTimeout4)
})
</script>

<template>
  <div class="login-page">
    <!-- 视频背景 -->
    <div class="video-hero">
      <div class="video-poster" :class="{ hidden: posterHidden }" />
      <video id="heroVideo" autoplay muted loop playsinline>
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>
      <div class="video-fallback" />
    </div>
    <div class="grain" />

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toastVisible" class="toast" :class="`toast-${toastType}`">
        <svg v-if="toastType === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <svg v-else-if="toastType === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <div class="wrapper">
      <!-- 浮动品牌标识 (独立于卡片，带呼吸动画) -->
      <div
        class="brand-float"
        :class="{ expanded: brandExpanded }"
        @click="toggleCard"
      >
        <div class="brand-icon">
          <svg width="28" height="28" viewBox="0 0 512 512" fill="#fff" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(1 1)">
              <path d="M221.629,74.886C207.914,88.6,200.6,102.314,200.6,116.943s7.314,29.257,21.029,43.886c1.829,1.829,3.657,2.743,6.4,2.743c1.829,0,4.571-0.914,6.4-2.743c3.657-3.657,3.657-9.143,0-12.8c-10.057-10.971-15.543-21.029-15.543-31.086s5.486-20.114,15.543-29.257c13.714-12.8,21.029-27.429,21.029-42.057c0-15.543-6.4-30.171-21.029-43.886c-3.657-3.657-9.143-3.657-12.8,0c-3.657,3.657-3.657,9.143,0,12.8c10.057,10.971,15.543,21.029,15.543,31.086C237.171,55.686,231.686,65.743,221.629,74.886z"/>
              <path d="M301.171,116.943c0,14.629,7.314,29.257,21.029,43.886c1.829,1.829,3.657,2.743,6.4,2.743c1.829,0,4.571-0.914,5.486-2.743c3.657-3.657,3.657-9.143,0-12.8c-10.057-10.971-15.543-21.029-15.543-31.086s5.486-20.114,15.543-29.257c14.629-12.8,21.943-27.429,21.943-42.057c0-15.543-7.314-30.171-21.029-43.886c-3.657-3.657-9.143-3.657-12.8,0s-3.657,9.143,0,12.8c10.057,10.971,15.543,21.029,15.543,31.086c0,10.057-5.486,19.2-15.543,29.257C308.486,88.6,301.171,102.314,301.171,116.943z"/>
              <path d="M109.171,116.943c0,14.629,7.314,29.257,21.029,43.886c1.829,1.829,3.657,2.743,6.4,2.743c1.829,0,4.571-0.914,5.486-2.743c3.657-3.657,3.657-9.143,0-12.8c-10.057-10.971-15.543-21.029-15.543-31.086s5.486-20.114,15.543-29.257c14.629-12.8,21.943-27.429,21.943-42.057c0-15.543-7.314-30.171-21.029-43.886c-3.657-3.657-9.143-3.657-12.8,0c-3.657,3.657-3.657,9.143,0,12.8c10.057,10.971,15.543,21.029,15.543,31.086c0,10.057-5.486,19.2-15.543,29.257C116.486,88.6,109.171,102.314,109.171,116.943z"/>
              <path d="M175,428.714c-64.914-10.971-97.829-47.543-111.543-120.686c-0.914-4.571-6.4-8.229-10.971-7.314s-8.229,6.4-7.314,10.971C59.8,393.057,99.114,434.2,171.343,447c0.914,0,0.914,0,1.829,0c4.571,0,8.229-2.743,9.143-7.314C183.229,434.2,179.571,429.629,175,428.714z"/>
              <path d="M470.314,236.714H456.6v0c0-4.571-1.829-9.143-5.486-12.8c-3.657-3.657-8.229-5.486-12.8-5.486H17.743c-4.571,0-9.143,1.829-12.8,5.486c-3.657,3.657-5.486,8.229-5.486,12.8c0.804,82.835,12.232,171.322,84.039,219.429h-56.61c-15.543,0-27.429,11.886-27.429,27.429c0,15.543,11.886,27.429,27.429,27.429h118.857c0.914,0,1.829,0,3.657-0.914l25.6-8.229h96.914l26.514,8.229c0.914,0.914,1.829,0.914,2.743,0.914h109.714c15.543,0,27.429-11.886,27.429-27.429c0-15.543-11.886-27.429-27.429-27.429h-38.324c16.198-10.851,29.323-23.757,39.946-38.19c56.317-10.056,98.035-59.298,98.035-117.239v-23.771C510.543,255,492.257,236.714,470.314,236.714z M356.029,275.114L374.314,287v59.429h-36.571V287L356.029,275.114z M420.029,483.571c0,5.486-3.657,9.143-9.143,9.143H303l-27.429-8.229c-0.914-0.914-1.829-0.914-2.743-0.914H172.257c-0.914,0-1.829,0.914-2.743,0.914l-25.6,8.229H26.886c-5.486,0-9.143-3.657-9.143-9.143c0-5.486,3.657-9.143,9.143-9.143h93.257h215.771h74.971C416.371,474.429,420.029,478.086,420.029,483.571z M334.086,456.143H121.057c-89.6-37.486-102.4-128-103.314-219.429h329.143v22.552l-23.771,15.848c-1.829,1.829-3.657,4.571-3.657,7.314v73.143c0,5.486,3.657,9.143,9.143,9.143h54.857c4.571,0,9.143-3.657,8.229-9.143v-73.143c0-2.743-0.914-5.486-3.657-7.314l-22.857-15.238v-23.162H437.4c0,5.159-0.047,10.315-0.145,15.459c-1.282,48.346-7.602,108.066-38.255,151.855c-0.546,0.819-0.909,1.81-1.129,2.858C382.784,427.443,362.162,444.397,334.086,456.143z M493.171,300.714c0,42.971-27.429,80.457-65.829,94.171C450.2,351,455.686,298.886,456.6,255h14.629c11.886,0,21.943,10.057,21.943,21.943V300.714z"/>
            </g>
          </svg>
        </div>
        <span class="brand-name">QingCha</span>
      </div>

      <!-- 登录卡片 (画卷展开/收起) -->
      <div class="login-card" :class="cardState">
        <div class="login-content">
          <!-- 可展开内容 -->
          <div class="login-expand">
            <!-- 头部 -->
            <div class="header">
              <h1>清茶茶馆经营系统</h1>
              <p>欢迎回来！从一杯好茶谈经营人生</p>
            </div>

            <!-- Tab 切换 -->
            <div class="tab-switch">
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'account' }"
                @click="activeTab = 'account'"
              >账号登录</button>
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'sms' }"
                @click="activeTab = 'sms'"
              >短信验证</button>
            </div>

            <!-- 账号登录 -->
            <form v-if="activeTab === 'account'" class="form" @submit="handleAccountLogin">
              <div class="field">
                <label class="field-label">邮箱</label>
                <input v-model="accountInput" type="email" class="field-input" placeholder="your@email.com" />
              </div>
              <div class="field">
                <label class="field-label">密码</label>
                <div class="input-wrap">
                  <input
                    v-model="passwordInput"
                    :type="showPassword ? 'text' : 'password'"
                    class="field-input"
                    placeholder="请输入密码"
                    maxlength="30"
                  />
                  <button type="button" class="pw-btn" @click="togglePassword">
                    <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div class="opts">
                <label class="remember" @click="rememberMe = !rememberMe">
                  <input type="checkbox" :checked="rememberMe" />
                  <span class="chk" />
                  记住账号
                </label>
                <a class="forgot" @click.prevent="showToast('info', '重置密码链接将发送至您的注册邮箱')">忘记密码？</a>
              </div>
              <button type="submit" class="btn-submit" :class="{ loading: isLoading, success: loginSuccess }">
                {{ loginSuccess ? '✓ 登录成功' : isLoading ? '' : '登 录' }}
              </button>
            </form>

            <!-- 短信登录 -->
            <form v-if="activeTab === 'sms'" class="form" @submit="handleSmsLogin">
              <div class="field">
                <label class="field-label">手机号</label>
                <input v-model="phoneInput" type="tel" class="field-input" placeholder="请输入手机号" maxlength="11" />
              </div>
              <div class="field">
                <label class="field-label">验证码</label>
                <div class="code-row">
                  <input v-model="codeInput" type="text" class="field-input" placeholder="6位数字" maxlength="6" inputmode="numeric" />
                  <button type="button" class="btn-code" :disabled="codeSent" @click="sendCode">
                    {{ codeSent ? `${codeCountdown}s` : '获取验证码' }}
                  </button>
                </div>
              </div>
              <div class="opts">
                <label class="remember" @click="rememberMe = !rememberMe">
                  <input type="checkbox" :checked="rememberMe" />
                  <span class="chk" />
                  记住账号
                </label>
                <span />
              </div>
              <button type="submit" class="btn-submit" :class="{ loading: isLoading, success: loginSuccess }">
                {{ loginSuccess ? '✓ 登录成功' : isLoading ? '' : '登 录' }}
              </button>
            </form>

            <div class="divider"><span>其他方式</span></div>

            <div class="socials">
              <button class="soc-btn" @click="showToast('info', '微信登录开发中')">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#07C160"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/></svg>
              </button>
              <button class="soc-btn" @click="showToast('info', 'Apple 登录开发中')">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              </button>
              <button class="soc-btn" @click="showToast('info', 'Google 登录开发中')">
                <svg width="22" height="22" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </button>
            </div>

            <div class="signup">
              还没有账户？<a @click.prevent="showToast('info', '注册功能开发中')">立即注册</a>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>&copy; 2026 QingCha. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: #1a1a2e;
}

// ─── 视频背景 ───
.video-hero {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(29,29,31,0.55) 0%, rgba(29,29,31,0.25) 50%, rgba(29,29,31,0.45) 100%);
    z-index: 1;
  }
}

.video-poster {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  background-image: url('/d.jpeg');
  transition: opacity 0.8s ease;

  &.hidden { opacity: 0; }
}

.video-fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  z-index: -1;
}

.grain {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0.018;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

// ─── 布局 ───
.wrapper {
  position: relative;
  z-index: 3;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ─── 浮动品牌 (独立于卡片，带呼吸动画) ───
.brand-float {
  text-align: center;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  z-index: 2;
  animation: breathe 3s $ease-apple infinite;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;

  // 品牌下方的脉冲光点
  &::after {
    content: '';
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $accent;
    box-shadow: 0 0 8px 2px rgba(52, 211, 153, 0.5);
    animation: dotPulse 3s $ease-apple infinite;
    pointer-events: none;
  }

  // 展开后切换为横向布局
  &.expanded {
    flex-direction: row;
    gap: 12px;
    animation: none;
    padding: 16px 20px;
    margin-bottom: 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    width: 100%;

    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      margin-bottom: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .brand-name {
      display: block;
      opacity: 0;
      animation: brandNameIn 0.35s $ease-apple 0.1s forwards;
    }

    &::after {
      display: none;
    }
  }
}

.brand-float .brand-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: linear-gradient(145deg, $accent, $accent-deep);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 8px 24px rgba(52,211,153,0.35), 0 2px 8px rgba(52,211,153,0.2);
  position: relative;
  transition: all 0.35s $ease-apple;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 18px;
    background: linear-gradient(145deg, rgba(255,255,255,0.3), transparent);
  }

  svg { position: relative; z-index: 1; }
}

.brand-float .brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  display: none;
}

// ─── 登录卡片 (画卷动画) ───
.login-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 0;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  width: 100%;
  max-height: 0;
  opacity: 0;
  transform-origin: center top;
  transition:
    max-height 0.35s $ease-apple,
    opacity 0.2s $ease-apple;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
  }

  // 展开中：卡片向下展开
  &.expanding {
    max-height: 800px;
    opacity: 1;
    padding: 36px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6);
    transition:
      max-height 0.35s $ease-apple,
      opacity 0.35s $ease-apple,
      padding 0.35s $ease-apple;
  }

  // 展开完成：稳定状态
  &.expanded {
    max-height: 800px;
    opacity: 1;
    padding: 36px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6);
  }

  // 收起阶段1：内容逐项退出
  &.collapsing {
    max-height: 800px;
    opacity: 1;
    padding: 36px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6);
  }

  // 收起阶段2：卡片向上卷成细线
  &.scrolling-up {
    max-height: 2px !important;
    opacity: 1;
    padding: 0 !important;
    overflow: hidden !important;
    transition:
      max-height 0.35s $ease-apple,
      padding 0.35s $ease-apple;
  }

  // 收起阶段3：细线淡出
  &.line-fade {
    max-height: 2px !important;
    opacity: 0;
    padding: 0 !important;
    overflow: hidden !important;
    transition: opacity 0.2s ease;
  }
}

.login-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
}

.login-expand {
  overflow: hidden;
}

// 展开时：子元素逐项进入
.login-card.expanding .login-expand > *,
.login-card.expanded .login-expand > * {
  opacity: 0;
  transform: translateY(12px);
  animation: staggerIn 0.35s $ease-apple forwards;
}

.login-card.expanding .login-expand > *:nth-child(1),
.login-card.expanded .login-expand > *:nth-child(1) { animation-delay: 0.06s; }
.login-card.expanding .login-expand > *:nth-child(2),
.login-card.expanded .login-expand > *:nth-child(2) { animation-delay: 0.10s; }
.login-card.expanding .login-expand > *:nth-child(3),
.login-card.expanded .login-expand > *:nth-child(3) { animation-delay: 0.14s; }
.login-card.expanding .login-expand > *:nth-child(4),
.login-card.expanded .login-expand > *:nth-child(4) { animation-delay: 0.18s; }
.login-card.expanding .login-expand > *:nth-child(5),
.login-card.expanded .login-expand > *:nth-child(5) { animation-delay: 0.22s; }
.login-card.expanding .login-expand > *:nth-child(6),
.login-card.expanded .login-expand > *:nth-child(6) { animation-delay: 0.26s; }

// 收起时：子元素逐项退出 (逆序)
.login-card.collapsing .login-expand > * {
  animation: staggerCollapse 0.2s $ease-apple forwards;
}

.login-card.collapsing .login-expand > *:nth-child(6) { animation-delay: 0.00s; }
.login-card.collapsing .login-expand > *:nth-child(5) { animation-delay: 0.025s; }
.login-card.collapsing .login-expand > *:nth-child(4) { animation-delay: 0.05s; }
.login-card.collapsing .login-expand > *:nth-child(3) { animation-delay: 0.075s; }
.login-card.collapsing .login-expand > *:nth-child(2) { animation-delay: 0.10s; }
.login-card.collapsing .login-expand > *:nth-child(1) { animation-delay: 0.125s; }

// ─── 头部 ───
.header {
  text-align: center;
  margin-bottom: 28px;

  h1 {
    font-size: 28px;
    font-weight: 600;
    color: $text;
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }

  p {
    font-size: 15px;
    color: $text-secondary;
    font-weight: 400;
  }
}

// ─── Tab 切换 ───
.tab-switch {
  display: flex;
  background: $bg-inset;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 24px;
  backdrop-filter: blur(20px);
  border: 1px solid $bg-glass-border;
}

.tab-btn {
  flex: 1;
  height: 42px;
  border: none;
  background: transparent;
  font-family: $font-sans;
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  border-radius: 11px;
  transition: all 0.3s $ease-apple;
  letter-spacing: 0.2px;

  &.active {
    background: rgba(255,255,255,0.7);
    color: $text;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
  }

  &:not(.active):hover { color: $text; }
}

// ─── 表单 ───
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  padding-left: 2px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-input {
  width: 100%;
  height: 52px;
  padding: 0 16px;
  font-size: 15px;
  font-family: $font-sans;
  color: $text;
  background: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: $radius-sm;
  outline: none;
  transition: all 0.25s $ease-apple;
  letter-spacing: 0.2px;

  &::placeholder {
    color: $text-muted;
    font-weight: 400;
  }

  &:focus {
    background: rgba(255,255,255,0.75);
    border-color: rgba(52,211,153,0.5);
    box-shadow: 0 0 0 3px rgba(52,211,153,0.12), 0 4px 16px rgba(52,211,153,0.08);
    transform: scale(1.01);
  }
}

.pw-btn {
  position: absolute;
  right: 6px;
  width: 38px; height: 38px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  border-radius: 8px;
  transition: all 0.15s $ease-standard;
  z-index: 2;

  &:hover { color: $text-secondary; background: rgba(0,0,0,0.03); }
  &:active { transform: scale(0.92); }
}

.code-row {
  display: flex;
  gap: 12px;

  .field-input { flex: 1; }
}

.btn-code {
  flex-shrink: 0;
  height: 52px;
  padding: 0 18px;
  border: 1px solid rgba(52,211,153,0.3);
  border-radius: $radius-sm;
  background: rgba(52,211,153,0.08);
  color: $accent-deep;
  font-family: $font-sans;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s $ease-standard;
  white-space: nowrap;

  &:hover { background: rgba(52,211,153,0.15); border-color: rgba(52,211,153,0.5); }
  &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.opts {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: $text-secondary;
  user-select: none;

  input { display: none; }
}

.chk {
  width: 18px; height: 18px;
  border: 1.5px solid rgba(0,0,0,0.12);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s $ease-apple;
  flex-shrink: 0;
  background: rgba(255,255,255,0.5);

  .remember input:checked + & {
    background: $accent;
    border-color: $accent;

    &::after {
      content: '';
      width: 5px; height: 9px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg) translateY(-0.5px);
    }
  }
}

.forgot {
  font-size: 13px;
  color: $accent-deep;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;

  &:hover { color: $accent; }
}

// ─── 提交按钮 ───
.btn-submit {
  width: 100%;
  height: 54px;
  background: linear-gradient(145deg, $accent, $accent-deep);
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  font-family: $font-sans;
  border: none;
  border-radius: $radius-sm;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.25s $ease-apple;
  letter-spacing: 0.3px;
  margin-top: 8px;
  box-shadow: 0 4px 14px rgba(52,211,153,0.35), 0 1px 3px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.2);

  &:hover {
    box-shadow: 0 8px 24px rgba(52,211,153,0.4), 0 2px 6px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.98) translateY(0);
    transition: transform 0.1s $ease-standard;
  }

  &.loading {
    color: transparent;
    pointer-events: none;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      margin: auto;
      width: 20px; height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  }

  &.success {
    background: linear-gradient(145deg, #10B981, $accent-deep);
    pointer-events: none;
  }
}

// ─── 分割线 ───
.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 0.5px;
    background: rgba(0,0,0,0.08);
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }
}

// ─── 社交登录 ───
.socials {
  display: flex;
  gap: 12px;
}

.soc-btn {
  flex: 1;
  height: 50px;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: $radius-sm;
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(8px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s $ease-apple;

  &:hover {
    background: rgba(255,255,255,0.65);
    border-color: rgba(0,0,0,0.1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }

  &:active { transform: scale(0.96); }
}

.signup {
  text-align: center;
  font-size: 14px;
  color: $text-muted;
  margin-top: 20px;

  a {
    color: $accent-deep;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;

    &:hover { color: $accent; }
  }
}

.footer {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}

// ─── Toast ───
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 20px;
  border-radius: $radius-sm;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
  backdrop-filter: blur(20px);
  max-width: 400px;

  &.toast-error {
    background: rgba(255,220,220,0.9);
    border: 1px solid rgba(239,68,68,0.15);
    color: #991B1B;
  }

  &.toast-success {
    background: rgba(220,252,231,0.9);
    border: 1px solid rgba(16,185,129,0.15);
    color: #166534;
  }

  &.toast-info {
    background: rgba(240,245,255,0.9);
    border: 1px solid rgba(99,102,241,0.15);
    color: #3730A3;
  }
}

.toast-enter-active { transition: all 0.35s $ease-apple; }
.toast-leave-active { transition: all 0.2s $ease-standard; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.98); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.98); }

// ─── 动画关键帧 ───
@keyframes breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.02); }
}

@keyframes dotPulse {
  0%, 100% {
    opacity: 0.3;
    transform: translateX(-50%) scale(0.8);
    box-shadow: 0 0 6px 1px rgba(52, 211, 153, 0.3);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.2);
    box-shadow: 0 0 12px 4px rgba(52, 211, 153, 0.6);
  }
}

@keyframes staggerIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes staggerCollapse {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px) scale(0.98); }
}

@keyframes brandNameIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin { to { transform: rotate(360deg); } }

// ─── 响应式 ───
@media (max-width: 480px) {
  .login-card.expanding,
  .login-card.expanded {
    padding: 32px 24px;
  }

  .header h1 {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
