<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabase } from '../composables/useSupabase'
import { useTimer, type TimerState } from '../composables/useTimer'

const { supabase } = useSupabase()
const { startTimer, stopTimer, setTimers, getRoomTimer } = useTimer()

const todayStats = ref({
  revenue: 0,
  bookings: 0,
  roomsInUse: 0,
  totalRooms: 4,
})

interface RoomInfo {
  id: number
  name: string
  capacity: string
  type: string
}

const rooms = ref<RoomInfo[]>([])

async function loadDashboard() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Load rooms
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, name, capacity_min, capacity_max, type')
      .eq('is_active', true)
      .order('id')

    rooms.value = (roomData || []).map(r => ({
      id: r.id,
      name: r.name,
      capacity: `${r.capacity_min}-${r.capacity_max}人`,
      type: r.type,
    }))
    todayStats.value.totalRooms = rooms.value.length

    // Load today's bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, room_id, start_time, end_time, status, total_amount, payment_status')
      .eq('booking_date', today)
      .neq('status', 'cancelled')

    todayStats.value.bookings = (bookings || []).length
    todayStats.value.revenue = (bookings || [])
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_amount, 0)

    // Build timer states for active bookings
    const activeBookings = (bookings || []).filter(b => b.status === 'in_progress')
    todayStats.value.roomsInUse = activeBookings.length

    const timerStates: TimerState[] = activeBookings.map(b => {
      const room = rooms.value.find(r => r.id === b.room_id)
      return {
        roomId: b.room_id,
        roomName: room?.name || '',
        bookingId: b.id,
        startTime: b.start_time,
        endTime: b.end_time,
        status: 'active',
        remainingMinutes: 0,
        remainingDisplay: '',
        overtimeMinutes: 0,
      }
    })
    setTimers(timerStates)
    startTimer()
  } catch (e) {
    console.error('Failed to load dashboard:', e)
  }
}

function getRoomStatus(roomId: number) {
  const timer = getRoomTimer(roomId)
  if (!timer) return { label: '空闲', class: 'status-idle', timer: null }
  if (timer.status === 'overtime') return { label: '已超时', class: 'status-overtime', timer }
  if (timer.status === 'warning') return { label: '即将超时', class: 'status-warning', timer }
  return { label: '使用中', class: 'status-active', timer }
}

onMounted(loadDashboard)
onUnmounted(() => { stopTimer() })
</script>

<template>
  <div class="dashboard">
    <!-- 今日概览 - 杂志感数字展示 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">今日营收</span>
          <span class="stat-value">¥{{ todayStats.revenue.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">今日预约</span>
          <span class="stat-value">{{ todayStats.bookings }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">包间使用</span>
          <span class="stat-value">{{ todayStats.roomsInUse }}<span class="stat-unit">/{{ todayStats.totalRooms }}</span></span>
        </div>
      </div>
    </section>

    <!-- 包间状态 -->
    <section class="rooms-section">
      <h2 class="section-title">包间状态</h2>
      <div class="rooms-grid">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          :class="getRoomStatus(room.id).class"
        >
          <div class="room-header">
            <span class="room-name">{{ room.name }}</span>
            <span class="room-status" :class="getRoomStatus(room.id).class">
              {{ getRoomStatus(room.id).label }}
            </span>
          </div>
          <div class="room-capacity">{{ room.capacity }}</div>
          <div v-if="getRoomStatus(room.id).timer" class="room-timer">
            {{ getRoomStatus(room.id).timer?.remainingDisplay }}
          </div>
        </div>
      </div>
    </section>

    <!-- 空状态提示 -->
    <section v-if="todayStats.bookings === 0" class="empty-state">
      <div class="empty-icon">
        <el-icon :size="48" color="#A1A1A6"><Calendar /></el-icon>
      </div>
      <p class="empty-text">今日暂无预约</p>
      <p class="empty-hint">点击「预约管理」创建第一个预约</p>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.dashboard {
  max-width: 960px;
}

// ─── 统计数字 - 杂志感大字 ───
.stats-section {
  margin-bottom: 48px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-muted;
  letter-spacing: 0.02em;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: $text;
  font-feature-settings: 'tnum';
}

.stat-unit {
  font-size: 1.25rem;
  font-weight: 400;
  color: $text-muted;
}

// ─── 包间状态 ───
.rooms-section {
  margin-bottom: 48px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: $text;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.room-card {
  background: $bg-card;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: $radius-md;
  padding: 20px;
  transition: all $duration-fast $ease-standard;

  &.status-active {
    border-left: 3px solid $accent;
  }

  &.status-warning {
    border-left: 3px solid #F59E0B;
    background: rgba(245, 158, 11, 0.03);
  }

  &.status-overtime {
    border-left: 3px solid $danger;
    background: rgba(239, 68, 68, 0.03);
  }

  &:active {
    transform: scale(0.99);
  }
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.room-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
}

.room-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 20px;

  &.status-idle {
    background: rgba(16, 185, 129, 0.08);
    color: $success;
  }

  &.status-active {
    background: rgba(52, 211, 153, 0.1);
    color: $accent-deep;
  }

  &.status-warning {
    background: rgba(245, 158, 11, 0.1);
    color: #D97706;
  }

  &.status-overtime {
    background: rgba(239, 68, 68, 0.08);
    color: $danger;
  }
}

.room-capacity {
  font-size: 13px;
  color: $text-muted;
  margin-bottom: 4px;
}

.room-timer {
  font-size: 14px;
  font-weight: 600;
  font-feature-settings: 'tnum';
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.04);

  .status-warning & {
    color: #D97706;
  }

  .status-overtime & {
    color: $danger;
  }
}

// ─── 空状态 ───
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: $text-secondary;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 13px;
  color: $text-muted;
}
</style>
