<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBooking } from '../composables/useBooking'
import { useOrder, type Product } from '../composables/useOrder'
import { usePackage } from '../composables/usePackage'
import { useSupabase } from '../composables/useSupabase'

const route = useRoute()
const router = useRouter()
const { fetchBookingById, currentBooking, checkIn, extendBooking } = useBooking()
const { orderItems, products, fetchOrderItems, fetchProducts, addOrderItem, removeOrderItem, updateOrderItemQuantity } = useOrder()
const { packages, fetchPackages } = usePackage()
const { supabase } = useSupabase()

const bookingId = Number(route.params.id)
const activeCategory = ref('tea')
const showCheckout = ref(false)
const paymentMethod = ref<'cash' | 'wechat' | 'alipay'>('wechat')
const checkoutLoading = ref(false)
const showExtendDialog = ref(false)
const extendHours = ref(1)

const categoryTabs = [
  { key: 'tea', label: '茶水' },
  { key: 'snack', label: '茶点' },
  { key: 'meal', label: '简餐' },
]

const bookingPkg = computed(() => {
  if (!currentBooking.value) return null
  return packages.value.find(p => p.id === currentBooking.value!.package_id)
})

const filteredProducts = computed(() => {
  return products.value.filter(p => p.category === activeCategory.value)
})

// Checkout calculations
const packageFee = computed(() => currentBooking.value?.package_fee || 0)
const addonsFee = computed(() => currentBooking.value?.addons_fee || 0)
const teaAmount = computed(() => currentBooking.value?.tea_amount || 0)

const overtimeHours = computed(() => {
  if (!currentBooking.value || currentBooking.value.status !== 'completed') return 0
  // Calculate overtime based on actual end time vs scheduled end time
  return currentBooking.value.overtime_hours || 0
})

const overtimeFee = computed(() => {
  if (!bookingPkg.value || overtimeHours.value <= 0) return 0
  // Check if tea spending meets threshold for free overtime
  const threshold = bookingPkg.value.spend_threshold
  if (threshold && teaAmount.value >= threshold) return 0
  const roomRate = currentBooking.value?.status === 'completed' ? 60 : 60 // TODO: get from room
  return overtimeHours.value * roomRate
})

const totalAmount = computed(() => {
  return packageFee.value + addonsFee.value + overtimeFee.value
})

const isOvertimeFree = computed(() => {
  if (!bookingPkg.value?.spend_threshold) return false
  return teaAmount.value >= bookingPkg.value.spend_threshold
})

async function loadDetail() {
  await Promise.all([fetchPackages(), fetchProducts()])
  await fetchBookingById(bookingId)
  await fetchOrderItems(bookingId)
}

async function handleAddProduct(product: Product) {
  if (currentBooking.value?.status !== 'in_progress') {
    ElMessage.warning('只能为进行中的订单加点')
    return
  }
  await addOrderItem(bookingId, product)
  await fetchBookingById(bookingId) // Refresh totals
  ElMessage.success(`已添加 ${product.name}`)
}

async function handleRemoveItem(itemId: number) {
  await removeOrderItem(itemId, bookingId)
  await fetchBookingById(bookingId)
}

async function handleQuantityChange(itemId: number, delta: number) {
  const item = orderItems.value.find(i => i.id === itemId)
  if (!item) return
  await updateOrderItemQuantity(itemId, bookingId, item.quantity + delta)
  await fetchBookingById(bookingId)
}

async function handleCheckIn() {
  await checkIn(bookingId)
  await fetchBookingById(bookingId)
  ElMessage.success('已签到')
}

async function handleExtend() {
  const result = await extendBooking(bookingId, extendHours.value)
  if (result) {
    await fetchBookingById(bookingId)
    showExtendDialog.value = false
    ElMessage.success(`已延长 ${extendHours.value} 小时，超时费 +¥${result.overtimeFee}`)
  }
}

function openCheckout() {
  showCheckout.value = true
}

async function handleCheckout() {
  checkoutLoading.value = true
  try {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (currentBooking.value) {
      if (currentBooking.value.status === 'in_progress') {
        // Full checkout: calculate overtime, mark completed
        const endMinutes = timeToMinutes(currentBooking.value.end_time)
        const nowMinutes = timeToMinutes(timeStr)
        const overtimeMins = Math.max(0, nowMinutes - endMinutes)
        const overtimeHrs = Math.ceil(overtimeMins / 60)

        const { error: err } = await supabase
          .from('bookings')
          .update({
            status: 'completed',
            actual_end_time: timeStr,
            overtime_hours: overtimeHrs,
            overtime_fee: overtimeFee.value,
            total_amount: totalAmount.value,
            payment_status: 'paid',
            payment_method: paymentMethod.value,
          })
          .eq('id', bookingId)
        if (err) throw err

        // Update customer stats
        if (currentBooking.value?.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('total_spent, visit_count')
            .eq('id', currentBooking.value.customer_id)
            .single()

          if (customer) {
            const { error: err } = await supabase
              .from('customers')
              .update({
                total_spent: customer.total_spent + totalAmount.value,
                visit_count: customer.visit_count + 1,
              })
              .eq('id', currentBooking.value.customer_id)
            if (err) throw err
          }
        }
      } else if (currentBooking.value.status === 'completed' && currentBooking.value.payment_status === 'unpaid') {
        // Supplement payment: only update payment info
        const { error: err } = await supabase
          .from('bookings')
          .update({
            total_amount: totalAmount.value,
            payment_status: 'paid',
            payment_method: paymentMethod.value,
          })
          .eq('id', bookingId)
        if (err) throw err

        // Update customer stats if not already counted
        if (currentBooking.value?.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('total_spent, visit_count')
            .eq('id', currentBooking.value.customer_id)
            .single()

          if (customer) {
            const { error: err } = await supabase
              .from('customers')
              .update({
                total_spent: customer.total_spent + totalAmount.value,
                visit_count: customer.visit_count + 1,
              })
              .eq('id', currentBooking.value.customer_id)
            if (err) throw err
          }
        }
      }
    }

    showCheckout.value = false
    ElMessage.success(currentBooking.value?.status === 'completed' ? '支付成功' : '结账成功')
    await loadDetail()
  } catch (e) {
    ElMessage.error('操作失败')
    console.error(e)
  } finally {
    checkoutLoading.value = false
  }
}

function formatCurrency(val: number) {
  return '¥' + val.toFixed(0)
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    booked: '已预约',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getStatusType(status: string) {
  const map: Record<string, string> = {
    booked: 'info',
    in_progress: 'success',
    completed: '',
    cancelled: 'danger',
  }
  return map[status] || ''
}

onMounted(loadDetail)
</script>

<template>
  <div class="booking-detail" v-if="currentBooking">
    <!-- 顶部信息 -->
    <div class="detail-header glass-panel">
      <div class="header-left">
        <el-button text @click="router.push('/app/bookings')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="booking-info">
          <h2>{{ currentBooking.room_name }} · {{ currentBooking.package_name }}</h2>
          <p>{{ currentBooking.booking_date }} {{ currentBooking.start_time }} - {{ currentBooking.end_time }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-tag :type="getStatusType(currentBooking.status) as any" size="large">
          {{ getStatusLabel(currentBooking.status) }}
        </el-tag>
        <el-button v-if="currentBooking.status === 'booked'" type="success" @click="handleCheckIn">
          签到入场
        </el-button>
        <el-button v-if="currentBooking.status === 'in_progress'" type="warning" @click="showExtendDialog = true">
          加时
        </el-button>
        <el-button v-if="currentBooking.status === 'in_progress'" type="primary" @click="openCheckout">
          结账
        </el-button>
        <el-button v-if="currentBooking.status === 'completed' && currentBooking.payment_status === 'unpaid'" type="danger" @click="openCheckout">
          补支付
        </el-button>
      </div>
    </div>

    <div class="detail-body">
      <!-- 已点商品 -->
      <section class="order-section">
        <h3 class="section-title">已点商品</h3>
        <div v-if="orderItems.length === 0" class="empty-order">
          <p>尚未添加商品</p>
        </div>
        <div v-else class="order-list">
          <div v-for="item in orderItems" :key="item.id" class="order-item">
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-price">{{ formatCurrency(item.price) }} × {{ item.quantity }}</span>
            </div>
            <div class="item-actions" v-if="currentBooking.status === 'in_progress'">
              <el-button size="small" text @click="handleQuantityChange(item.id, -1)">
                <el-icon><Minus /></el-icon>
              </el-button>
              <span class="item-qty">{{ item.quantity }}</span>
              <el-button size="small" text @click="handleQuantityChange(item.id, 1)">
                <el-icon><Plus /></el-icon>
              </el-button>
              <el-button size="small" type="danger" text @click="handleRemoveItem(item.id)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 费用汇总 -->
        <div class="order-summary">
          <div class="summary-row">
            <span>套餐费用</span>
            <span>{{ formatCurrency(packageFee) }}</span>
          </div>
          <div class="summary-row">
            <span>加点费用</span>
            <span>{{ formatCurrency(addonsFee) }}</span>
          </div>
          <div v-if="overtimeHours > 0" class="summary-row">
            <span>超时费用 ({{ overtimeHours }}小时)</span>
            <span :class="{ 'free-text': isOvertimeFree }">
              {{ isOvertimeFree ? '已减免' : formatCurrency(overtimeFee) }}
            </span>
          </div>
          <div v-if="isOvertimeFree" class="summary-row hint">
            <span>茶水消费达标，超时费已免除</span>
          </div>
          <div class="summary-row total">
            <span>合计</span>
            <span>{{ formatCurrency(totalAmount) }}</span>
          </div>
        </div>
      </section>

      <!-- 加点商品 (仅进行中) -->
      <section v-if="currentBooking.status === 'in_progress'" class="products-section">
        <h3 class="section-title">加点商品</h3>
        <div class="category-tabs">
          <button
            v-for="cat in categoryTabs"
            :key="cat.key"
            class="cat-tab"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >{{ cat.label }}</button>
        </div>
        <div class="products-grid">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
            @click="handleAddProduct(product)"
          >
            <div class="product-img">
              <img :src="product.image_url" :alt="product.name" @error="($event.target as HTMLImageElement).src = '/images/placeholder/tea.png'" />
            </div>
            <div class="product-info">
              <span class="product-name">{{ product.name }}</span>
              <span class="product-price">{{ formatCurrency(product.price) }}/{{ product.unit }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 加时弹窗 -->
    <el-dialog v-model="showExtendDialog" title="加时" width="400px">
      <div style="margin-bottom: 16px;">
        <p style="color: #6E6E73; margin-bottom: 12px;">
          当前结束时间：<strong>{{ currentBooking?.end_time }}</strong>
        </p>
        <el-form label-position="top">
          <el-form-item label="延长时长">
            <el-select v-model="extendHours" style="width: 100%">
              <el-option :label="`+1 小时`" :value="1" />
              <el-option :label="`+2 小时`" :value="2" />
              <el-option :label="`+3 小时`" :value="3" />
            </el-select>
          </el-form-item>
        </el-form>
        <p style="color: #6E6E73; font-size: 13px;">
          超时费：¥{{ currentBooking?.overtime_fee || 0 }}（按包间超时费率计算）
        </p>
      </div>
      <template #footer>
        <el-button @click="showExtendDialog = false">取消</el-button>
        <el-button type="primary" @click="handleExtend">确认加时</el-button>
      </template>
    </el-dialog>

    <!-- 结账弹窗 -->
    <el-dialog v-model="showCheckout" title="确认结账" width="480px">
      <div class="checkout-content">
        <div class="checkout-summary">
          <div class="checkout-row">
            <span>套餐</span>
            <span>{{ currentBooking.package_name }}</span>
          </div>
          <div class="checkout-row">
            <span>套餐费用</span>
            <span>{{ formatCurrency(packageFee) }}</span>
          </div>
          <div class="checkout-row">
            <span>加点费用</span>
            <span>{{ formatCurrency(addonsFee) }}</span>
          </div>
          <div v-if="overtimeHours > 0" class="checkout-row">
            <span>超时费</span>
            <span>{{ isOvertimeFree ? '已减免' : formatCurrency(overtimeFee) }}</span>
          </div>
          <div class="checkout-row total">
            <span>应付金额</span>
            <span class="total-amount">{{ formatCurrency(totalAmount) }}</span>
          </div>
        </div>

        <div class="payment-method">
          <p class="payment-label">支付方式</p>
          <div class="payment-options">
            <button
              class="payment-btn"
              :class="{ active: paymentMethod === 'wechat' }"
              @click="paymentMethod = 'wechat'"
            >微信支付</button>
            <button
              class="payment-btn"
              :class="{ active: paymentMethod === 'alipay' }"
              @click="paymentMethod = 'alipay'"
            >支付宝</button>
            <button
              class="payment-btn"
              :class="{ active: paymentMethod === 'cash' }"
              @click="paymentMethod = 'cash'"
            >现金</button>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showCheckout = false">取消</el-button>
        <el-button type="primary" :loading="checkoutLoading" @click="handleCheckout">
          确认收款 {{ formatCurrency(totalAmount) }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.booking-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.booking-info {
  h2 {
    font-size: 18px;
    font-weight: 600;
    color: $text;
    margin-bottom: 2px;
  }

  p {
    font-size: 13px;
    color: $text-secondary;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  margin-bottom: 16px;
}

// ─── 已点商品 ───
.order-section {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 24px;
}

.empty-order {
  text-align: center;
  padding: 32px 0;
  color: $text-muted;
  font-size: 14px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: $bg-inset;
  border-radius: $radius-sm;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: $text;
}

.item-price {
  font-size: 13px;
  color: $text-secondary;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-qty {
  font-size: 14px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.order-summary {
  border-top: 1px solid rgba(0,0,0,0.06);
  padding-top: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: $text-secondary;
  padding: 4px 0;

  &.total {
    font-size: 16px;
    font-weight: 600;
    color: $text;
    border-top: 1px solid rgba(0,0,0,0.06);
    margin-top: 8px;
    padding-top: 12px;
  }

  &.hint {
    font-size: 12px;
    color: $accent-deep;
  }
}

.free-text {
  color: $accent-deep;
  text-decoration: line-through;
}

// ─── 加点商品 ───
.products-section {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 24px;
}

.category-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: $bg-inset;
  border-radius: 12px;
  padding: 4px;
}

.cat-tab {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  font-family: $font-sans;
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  border-radius: 9px;
  transition: all 0.2s $ease-standard;

  &.active {
    background: rgba(255,255,255,0.7);
    color: $text;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.product-card {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: $bg-inset;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all 0.15s $ease-standard;

  &:hover {
    background: rgba(52,211,153,0.06);
  }

  &:active {
    transform: scale(0.98);
  }
}

.product-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(0,0,0,0.03);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.product-name {
  font-size: 13px;
  font-weight: 500;
  color: $text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-price {
  font-size: 12px;
  color: $text-secondary;
}

// ─── 结账弹窗 ───
.checkout-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.checkout-summary {
  background: $bg-inset;
  border-radius: $radius-sm;
  padding: 16px;
}

.checkout-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: $text-secondary;
  padding: 6px 0;

  &.total {
    font-size: 18px;
    font-weight: 600;
    color: $text;
    border-top: 1px solid rgba(0,0,0,0.06);
    margin-top: 8px;
    padding-top: 12px;
  }
}

.total-amount {
  color: $accent-deep;
  font-size: 22px;
}

.payment-label {
  font-size: 14px;
  font-weight: 500;
  color: $text;
  margin-bottom: 12px;
}

.payment-options {
  display: flex;
  gap: 8px;
}

.payment-btn {
  flex: 1;
  height: 44px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.5);
  border-radius: $radius-sm;
  font-family: $font-sans;
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.2s $ease-standard;

  &.active {
    border-color: $accent;
    background: rgba(52,211,153,0.06);
    color: $accent-deep;
    font-weight: 600;
  }

  &:hover:not(.active) {
    border-color: rgba(0,0,0,0.15);
  }
}
</style>
