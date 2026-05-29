<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useBooking, type Booking, type CreateBookingParams } from '../composables/useBooking'
import { useRoom, type Room } from '../composables/useRoom'
import { usePackage } from '../composables/usePackage'
import { useCustomer } from '../composables/useCustomer'

const router = useRouter()
const { bookings, loading: bookingsLoading, fetchBookings, createBooking, cancelBooking, checkIn, completeBooking } = useBooking()
const { rooms, fetchRooms } = useRoom()
const { packages, fetchPackages, getPackageRooms } = usePackage()
const { customers, fetchCustomers } = useCustomer()

// Filters
const filterDate = ref('')
const filterStatus = ref('')
const filterRoom = ref<number | ''>('')

// Create dialog
const showCreateDialog = ref(false)
const createForm = ref<CreateBookingParams>({
  room_id: 0,
  package_id: 0,
  customer_id: undefined,
  booking_date: '',
  start_time: '',
  end_time: '',
  notes: '',
})
const availableRooms = ref<Room[]>([])
const createLoading = ref(false)

// Walk-in dialog
const showWalkInDialog = ref(false)
const walkInForm = ref<CreateBookingParams>({
  room_id: 0,
  package_id: 0,
  customer_id: undefined,
  booking_date: '',
  start_time: '',
  end_time: '',
  notes: '',
})
const walkInAvailableRooms = ref<Room[]>([])
const walkInLoading = ref(false)

// Time slot options
const timeSlots = computed(() => {
  const slots: string[] = []
  for (let h = 9; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
})

const statusMap: Record<string, { label: string; type: string }> = {
  booked: { label: '已预约', type: 'info' },
  in_progress: { label: '进行中', type: 'success' },
  completed: { label: '已完成', type: '' },
  cancelled: { label: '已取消', type: 'danger' },
}

const paymentMap: Record<string, { label: string; type: string }> = {
  unpaid: { label: '未付', type: 'warning' },
  paid: { label: '已付', type: 'success' },
}

async function loadData() {
  await Promise.all([fetchRooms(), fetchPackages(), fetchCustomers()])
  await loadBookings()
}

async function loadBookings() {
  const filters: Record<string, unknown> = {}
  if (filterDate.value) filters.date = filterDate.value
  if (filterStatus.value) filters.status = filterStatus.value
  if (filterRoom.value) filters.room_id = filterRoom.value
  await fetchBookings(filters)
}

function resetFilters() {
  filterDate.value = ''
  filterStatus.value = ''
  filterRoom.value = ''
  loadBookings()
}

function openCreateDialog() {
  createForm.value = {
    room_id: 0,
    package_id: 0,
    customer_id: undefined,
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '16:00',
    notes: '',
  }
  availableRooms.value = []
  showCreateDialog.value = true
}

async function onPackageChange(packageId: number) {
  if (packageId) {
    const rooms = await getPackageRooms(packageId)
    availableRooms.value = rooms.map(r => ({
      ...r,
      capacity_min: 0, capacity_max: 0, type: '', hourly_rate: 0, image_url: '', is_active: true
    }))
    if (availableRooms.value.length > 0 && !availableRooms.value.find(r => r.id === createForm.value.room_id)) {
      createForm.value.room_id = 0
    }
  } else {
    availableRooms.value = []
  }
}

async function handleCreate() {
  if (!createForm.value.room_id) { ElMessage.warning('请选择包间'); return }
  if (!createForm.value.package_id) { ElMessage.warning('请选择套餐'); return }
  if (!createForm.value.booking_date) { ElMessage.warning('请选择日期'); return }
  if (!createForm.value.start_time) { ElMessage.warning('请选择开始时间'); return }
  if (!createForm.value.end_time) { ElMessage.warning('请选择结束时间'); return }

  createLoading.value = true
  const id = await createBooking(createForm.value)
  createLoading.value = false

  if (id) {
    ElMessage.success('预约创建成功')
    showCreateDialog.value = false
    await loadBookings()
  } else {
    ElMessage.error('创建失败')
  }
}

// ─── 散客开单 ───
function openWalkInDialog() {
  const now = new Date()
  const HH = String(now.getHours()).padStart(2, '0')
  const MM = String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')
  const currentMinute = now.getMinutes() % 30
  const roundedMM = currentMinute > 0 ? String(Math.min(59, Math.floor(now.getMinutes() / 30) * 30 + 30)).padStart(2, '0') : MM

  walkInForm.value = {
    room_id: 0,
    package_id: 0,
    booking_date: now.toISOString().split('T')[0],
    start_time: `${HH}:${roundedMM || MM}`,
    end_time: '',
    notes: '',
  }
  walkInAvailableRooms.value = []
  showWalkInDialog.value = true
}

async function onWalkInPackageChange(packageId: number) {
  if (packageId) {
    const rooms = await getPackageRooms(packageId)
    walkInAvailableRooms.value = rooms.map(r => ({
      ...r,
      capacity_min: 0, capacity_max: 0, type: '', hourly_rate: 0, image_url: '', is_active: true
    }))
    // Auto-calculate end time
    const pkg = packages.value.find(p => p.id === packageId)
    if (pkg && walkInForm.value.start_time) {
      walkInForm.value.end_time = addHours(walkInForm.value.start_time, pkg.duration_hours)
    }
    if (walkInAvailableRooms.value.length > 0 && !walkInAvailableRooms.value.find(r => r.id === walkInForm.value.room_id)) {
      walkInForm.value.room_id = 0
    }
  } else {
    walkInAvailableRooms.value = []
    walkInForm.value.end_time = ''
  }
}

function onWalkInStartTimeChange() {
  const pkg = packages.value.find(p => p.id === walkInForm.value.package_id)
  if (pkg && walkInForm.value.start_time) {
    walkInForm.value.end_time = addHours(walkInForm.value.start_time, pkg.duration_hours)
  } else if (!pkg && walkInForm.value.start_time) {
    // No package: default 2 hours
    walkInForm.value.end_time = addHours(walkInForm.value.start_time, 2)
  }
}

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m + hours * 60
  const newH = Math.floor(totalMinutes / 60) % 24
  const newM = totalMinutes % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

async function handleWalkInCreate() {
  if (!walkInForm.value.package_id) { ElMessage.warning('请选择套餐'); return }
  if (!walkInForm.value.room_id) { ElMessage.warning('请选择包间'); return }

  walkInLoading.value = true
  const id = await createBooking({
    ...walkInForm.value,
    initial_status: 'in_progress',
  })
  walkInLoading.value = false

  if (id) {
    ElMessage.success('散客开单成功')
    showWalkInDialog.value = false
    await loadBookings()
  } else {
    ElMessage.error('开单失败')
  }
}

async function handleCancel(booking: Booking) {
  try {
    await ElMessageBox.confirm(`确定取消该预约？`, '取消预约', { type: 'warning' })
    await cancelBooking(booking.id)
    ElMessage.success('已取消')
    await loadBookings()
  } catch {}
}

async function handleCheckIn(booking: Booking) {
  await checkIn(booking.id)
  ElMessage.success('已签到')
  await loadBookings()
}

async function handleComplete(booking: Booking) {
  await completeBooking(booking.id)
  ElMessage.success('已完成')
  await loadBookings()
}

function viewDetail(booking: Booking) {
  router.push(`/app/bookings/${booking.id}`)
}

function formatCurrency(val: number) {
  return '¥' + val.toFixed(0)
}

onMounted(loadData)
</script>

<template>
  <div class="bookings-page">
    <!-- 顶部操作栏 -->
    <div class="action-bar glass-panel">
      <div class="filters">
        <el-date-picker
          v-model="filterDate"
          type="date"
          placeholder="筛选日期"
          value-format="YYYY-MM-DD"
          size="default"
          @change="loadBookings"
        />
        <el-select v-model="filterStatus" placeholder="预约状态" clearable size="default" @change="loadBookings">
          <el-option label="已预约" value="booked" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select v-model="filterRoom" placeholder="包间" clearable size="default" @change="loadBookings">
          <el-option v-for="r in rooms" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
        <el-button size="default" @click="resetFilters">重置</el-button>
      </div>
      <div class="action-btns-right">
        <el-button @click="openWalkInDialog">
          <el-icon><Service /></el-icon>
          散客开单
        </el-button>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建预约
        </el-button>
      </div>
    </div>

    <!-- 预约列表 -->
    <div class="booking-list">
      <el-table
        :data="bookings"
        v-loading="bookingsLoading"
        stripe
        style="width: 100%"
        @row-click="viewDetail"
        row-class-name="clickable-row"
      >
        <el-table-column prop="booking_date" label="日期" width="120" />
        <el-table-column label="时间" width="140">
          <template #default="{ row }">
            {{ row.start_time }} - {{ row.end_time }}
          </template>
        </el-table-column>
        <el-table-column prop="room_name" label="包间" width="100" />
        <el-table-column prop="package_name" label="套餐" min-width="150" />
        <el-table-column label="客户" width="120">
          <template #default="{ row }">
            {{ row.customer_name || '散客' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type as any" size="small">
              {{ statusMap[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付" width="80">
          <template #default="{ row }">
            <el-tag :type="paymentMap[row.payment_status]?.type as any" size="small" effect="plain">
              {{ paymentMap[row.payment_status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="right">
          <template #default="{ row }">
            <span class="amount">{{ formatCurrency(row.total_amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-btns" @click.stop>
              <el-button v-if="row.status === 'booked'" size="small" type="success" @click="handleCheckIn(row)">签到</el-button>
              <el-button v-if="row.status === 'in_progress'" size="small" type="primary" @click="viewDetail(row)">点单</el-button>
              <el-button v-if="row.status === 'in_progress'" size="small" type="warning" @click="handleComplete(row)">完成</el-button>
              <el-button v-if="row.status === 'completed' && row.payment_status === 'unpaid'" size="small" type="danger" @click="viewDetail(row)">补支付</el-button>
              <el-button v-if="row.status === 'booked'" size="small" type="danger" text @click="handleCancel(row)">取消</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!bookingsLoading && bookings.length === 0" class="empty-state">
        <el-icon :size="48" class="empty-icon"><Calendar /></el-icon>
        <h3>暂无预约</h3>
        <p>点击"新建预约"开始管理您的茶室预约</p>
      </div>
    </div>

    <!-- 新建预约弹窗 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建预约"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="createForm" label-position="top" class="create-form">
        <el-form-item label="选择套餐" required>
          <el-select
            v-model="createForm.package_id"
            placeholder="请选择套餐"
            style="width: 100%"
            @change="onPackageChange"
          >
            <el-option
              v-for="pkg in packages"
              :key="pkg.id"
              :label="`${pkg.name} — ¥${pkg.price} / ${pkg.duration_hours}小时`"
              :value="pkg.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关联会员">
          <el-select
            v-model="createForm.customer_id"
            placeholder="可选：搜索会员姓名或手机号"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="c in customers"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择包间" required>
          <el-select
            v-model="createForm.room_id"
            placeholder="请先选择套餐"
            style="width: 100%"
            :disabled="!createForm.package_id"
          >
            <el-option
              v-for="r in availableRooms"
              :key="r.id"
              :label="r.name"
              :value="r.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="预约日期" required>
          <el-date-picker
            v-model="createForm.booking_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <div class="time-row">
          <el-form-item label="开始时间" required style="flex: 1">
            <el-select v-model="createForm.start_time" placeholder="开始时间" style="width: 100%">
              <el-option v-for="t in timeSlots" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="结束时间" required style="flex: 1">
            <el-select v-model="createForm.end_time" placeholder="结束时间" style="width: 100%">
              <el-option v-for="t in timeSlots" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="可选：客户偏好、特殊要求等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 散客开单弹窗 -->
    <el-dialog
      v-model="showWalkInDialog"
      title="散客开单"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="walkInForm" label-position="top" class="create-form">
        <el-form-item label="选择套餐" required>
          <el-select
            v-model="walkInForm.package_id"
            placeholder="请选择套餐"
            style="width: 100%"
            @change="onWalkInPackageChange"
          >
            <el-option
              v-for="pkg in packages"
              :key="pkg.id"
              :label="`${pkg.name} — ¥${pkg.price} / ${pkg.duration_hours}小时`"
              :value="pkg.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关联会员">
          <el-select
            v-model="walkInForm.customer_id"
            placeholder="可选：搜索会员姓名或手机号"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="c in customers"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择包间" required>
          <el-select
            v-model="walkInForm.room_id"
            placeholder="请先选择套餐"
            style="width: 100%"
            :disabled="!walkInForm.package_id"
          >
            <el-option
              v-for="r in walkInAvailableRooms"
              :key="r.id"
              :label="r.name"
              :value="r.id"
            />
          </el-select>
        </el-form-item>

        <div class="time-row">
          <el-form-item label="开始时间" required style="flex: 1">
            <el-select v-model="walkInForm.start_time" placeholder="开始时间" style="width: 100%" @change="onWalkInStartTimeChange">
              <el-option v-for="t in timeSlots" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计结束" style="flex: 1">
            <el-input :model-value="walkInForm.end_time || '选择套餐后自动计算'" disabled />
          </el-form-item>
        </div>

        <el-form-item label="备注">
          <el-input
            v-model="walkInForm.notes"
            type="textarea"
            :rows="2"
            placeholder="可选：客户偏好、特殊要求等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showWalkInDialog = false">取消</el-button>
        <el-button type="primary" :loading="walkInLoading" @click="handleWalkInCreate">确认开单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.bookings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.action-btns-right {
  display: flex;
  gap: 8px;
}

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.booking-list {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 4px;
  overflow: hidden;
}

.amount {
  font-weight: 600;
  color: $text;
}

.action-btns {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;

  .empty-icon {
    color: $text-muted;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: $text;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: $text-secondary;
  }
}

.create-form {
  .time-row {
    display: flex;
    gap: 16px;
  }
}

:deep(.clickable-row) {
  cursor: pointer;
}
</style>
