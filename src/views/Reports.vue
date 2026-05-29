<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSupabase } from '../composables/useSupabase'

const { supabase } = useSupabase()

const dateRange = ref<[string, string]>([
  new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0],
])

interface DailyStats {
  date: string
  revenue: number
  bookings: number
  tea: number
  snack: number
  meal: number
}

const dailyStats = ref<DailyStats[]>([])
const roomUsage = ref<{ name: string; count: number }[]>([])
const topProducts = ref<{ name: string; count: number; total: number }[]>([])
const topCustomers = ref<{ name: string; total: number; visits: number }[]>([])

const totalRevenue = computed(() => dailyStats.value.reduce((s, d) => s + d.revenue, 0))
const totalBookings = computed(() => dailyStats.value.reduce((s, d) => s + d.bookings, 0))
const avgRevenue = computed(() => dailyStats.value.length > 0 ? totalRevenue.value / dailyStats.value.length : 0)

// 趋势图数据
const chartViewMode = ref<'revenue' | 'category'>('revenue')

const trendChart = computed(() => {
  const data = dailyStats.value
  if (data.length === 0) return null

  const w = 600, h = 200, padL = 50, padR = 20, padT = 10, padB = 30
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const maxVal = Math.max(...data.map(d => d.revenue), 1)
  const yMax = Math.ceil(maxVal / 100) * 100

  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2

  function toX(i: number) { return padL + (data.length > 1 ? i * xStep : chartW / 2) }
  function toY(v: number) { return padT + chartH - (v / yMax) * chartH }

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.revenue)}`).join(' ')
  const areaPath = linePath + ` L${toX(data.length - 1)},${padT + chartH} L${toX(0)},${padT + chartH} Z`

  const teaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.tea)}`).join(' ')
  const snackPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.snack)}`).join(' ')
  const mealPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.meal)}`).join(' ')

  const labelInterval = Math.max(1, Math.ceil(data.length / 8))
  const xLabels = data.filter((_, i) => i % labelInterval === 0 || i === data.length - 1).map((d) => ({
    x: toX(data.indexOf(d)),
    label: d.date.slice(5),
  }))

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    y: toY(yMax * r),
    label: formatCurrency(yMax * r),
  }))

  return { w, h, padL, padR, padT, padB, chartW, chartH, linePath, areaPath, teaPath, snackPath, mealPath, xLabels, yLabels, data, toX, toY }
})

async function loadReport() {
  const [start, end] = dateRange.value

  // Daily stats via RPC
  const { data: statsData } = await supabase.rpc('get_daily_stats', { start_date: start, end_date: end })

  // Order breakdown via RPC
  const { data: breakdownData } = await supabase.rpc('get_order_breakdown', { start_date: start, end_date: end })

  // Group by date
  const dateMap = new Map<string, DailyStats>()
  for (const r of (statsData || [])) {
    const dateStr = r.booking_date
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: dateStr, revenue: 0, bookings: 0, tea: 0, snack: 0, meal: 0 })
    }
    const stat = dateMap.get(dateStr)!
    stat.revenue += Number(r.revenue)
    stat.bookings += Number(r.bookings)
  }

  for (const o of (breakdownData || [])) {
    const stat = dateMap.get(o.booking_date)
    if (stat) {
      if (o.category === 'tea') stat.tea += Number(o.amount)
      else if (o.category === 'snack') stat.snack += Number(o.amount)
      else if (o.category === 'meal') stat.meal += Number(o.amount)
    }
  }

  dailyStats.value = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Room usage via RPC
  const { data: roomData } = await supabase.rpc('get_room_usage', { start_date: start, end_date: end })
  roomUsage.value = (roomData || []).map((r: any) => ({ name: r.name, count: Number(r.count) }))

  // Top products via RPC
  const { data: prodData } = await supabase.rpc('get_top_products', { start_date: start, end_date: end })
  topProducts.value = (prodData || []).map((p: any) => ({ name: p.name, count: Number(p.count), total: Number(p.total) }))

  // Top customers via RPC
  const { data: custData } = await supabase.rpc('get_top_customers', { start_date: start, end_date: end })
  topCustomers.value = (custData || []).map((c: any) => ({ name: c.name, total: Number(c.total), visits: Number(c.visits) }))
}

function formatCurrency(val: number) {
  return '¥' + val.toFixed(0)
}

onMounted(loadReport)
</script>

<template>
  <div class="reports-page">
    <!-- 筛选 -->
    <div class="action-bar glass-panel">
      <div class="filters">
        <span class="filter-label">日期范围</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="loadReport"
        />
      </div>
      <el-button @click="loadReport">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-grid">
      <div class="overview-card">
        <span class="overview-label">总营收</span>
        <span class="overview-value">{{ formatCurrency(totalRevenue) }}</span>
      </div>
      <div class="overview-card">
        <span class="overview-label">总订单</span>
        <span class="overview-value">{{ totalBookings }}</span>
      </div>
      <div class="overview-card">
        <span class="overview-label">日均营收</span>
        <span class="overview-value">{{ formatCurrency(avgRevenue) }}</span>
      </div>
    </div>

    <!-- 趋势图 -->
    <section class="report-card trend-card">
      <div class="trend-header">
        <h3 class="card-title">营收趋势</h3>
        <el-radio-group v-model="chartViewMode" size="small">
          <el-radio-button value="revenue">总营收</el-radio-button>
          <el-radio-button value="category">分类</el-radio-button>
        </el-radio-group>
      </div>
      <div v-if="!trendChart" class="empty-card">暂无数据</div>
      <svg v-else :viewBox="`0 0 ${trendChart.w} ${trendChart.h}`" class="trend-svg">
        <line v-for="yl in trendChart.yLabels" :key="yl.y"
          :x1="trendChart.padL" :y1="yl.y" :x2="trendChart.w - trendChart.padR" :y2="yl.y"
          stroke="rgba(0,0,0,0.04)" stroke-width="1" />
        <text v-for="yl in trendChart.yLabels" :key="'yl' + yl.y"
          :x="trendChart.padL - 8" :y="yl.y + 4" text-anchor="end" class="chart-label">
          {{ yl.label }}
        </text>
        <text v-for="xl in trendChart.xLabels" :key="'xl' + xl.label"
          :x="xl.x" :y="trendChart.h - 4" text-anchor="middle" class="chart-label">
          {{ xl.label }}
        </text>

        <template v-if="chartViewMode === 'revenue'">
          <path :d="trendChart.areaPath" fill="url(#areaGrad)" opacity="0.3" />
          <path :d="trendChart.linePath" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="(d, i) in trendChart.data" :key="i"
            :cx="trendChart.toX(i)" :cy="trendChart.toY(d.revenue)" r="3.5"
            fill="#fff" stroke="#34D399" stroke-width="2" />
        </template>

        <template v-else>
          <path :d="trendChart.teaPath" fill="none" stroke="#34D399" stroke-width="2" stroke-linecap="round" />
          <path :d="trendChart.snackPath" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" />
          <path :d="trendChart.mealPath" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" />
        </template>

        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#34D399" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#34D399" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div v-if="chartViewMode === 'category' && trendChart" class="chart-legend">
        <span class="legend-item"><i class="legend-dot" style="background:#34D399" />茶水</span>
        <span class="legend-item"><i class="legend-dot" style="background:#F59E0B" />茶点</span>
        <span class="legend-item"><i class="legend-dot" style="background:#6366F1" />简餐</span>
      </div>
    </section>

    <div class="report-grid">
      <!-- 每日营收 -->
      <section class="report-card">
        <h3 class="card-title">每日营收</h3>
        <el-table :data="dailyStats" stripe size="small" max-height="360">
          <el-table-column prop="date" label="日期" width="110" />
          <el-table-column label="营收" width="100" align="right">
            <template #default="{ row }">{{ formatCurrency(row.revenue) }}</template>
          </el-table-column>
          <el-table-column prop="bookings" label="订单" width="60" align="center" />
          <el-table-column label="茶水" width="80" align="right">
            <template #default="{ row }">{{ formatCurrency(row.tea) }}</template>
          </el-table-column>
          <el-table-column label="茶点" width="80" align="right">
            <template #default="{ row }">{{ formatCurrency(row.snack) }}</template>
          </el-table-column>
          <el-table-column label="简餐" width="80" align="right">
            <template #default="{ row }">{{ formatCurrency(row.meal) }}</template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 包间使用率 -->
      <section class="report-card">
        <h3 class="card-title">包间使用率</h3>
        <div v-if="roomUsage.length === 0" class="empty-card">暂无数据</div>
        <div v-else class="usage-list">
          <div v-for="room in roomUsage" :key="room.name" class="usage-item">
            <span class="usage-name">{{ room.name }}</span>
            <div class="usage-bar">
              <div class="usage-fill" :style="{ width: `${Math.min(100, (room.count / Math.max(...roomUsage.map(r => r.count))) * 100)}%` }" />
            </div>
            <span class="usage-count">{{ room.count }} 次</span>
          </div>
        </div>
      </section>

      <!-- 热销商品 -->
      <section class="report-card">
        <h3 class="card-title">热销商品 TOP 10</h3>
        <el-table :data="topProducts" stripe size="small" max-height="360">
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="商品" min-width="120" />
          <el-table-column prop="count" label="销量" width="70" align="center" />
          <el-table-column label="金额" width="90" align="right">
            <template #default="{ row }">{{ formatCurrency(row.total) }}</template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 会员消费排行 -->
      <section class="report-card">
        <h3 class="card-title">会员消费排行</h3>
        <div v-if="topCustomers.length === 0" class="empty-card">暂无数据</div>
        <el-table v-else :data="topCustomers" stripe size="small" max-height="360">
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="会员" min-width="100" />
          <el-table-column prop="visits" label="到店" width="60" align="center" />
          <el-table-column label="消费总额" width="100" align="right">
            <template #default="{ row }">{{ formatCurrency(row.total) }}</template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.reports-page {
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

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.overview-card {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-md;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-muted;
}

.overview-value {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: $text;
  font-feature-settings: 'tnum';
}

.report-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.report-card {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 24px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  margin-bottom: 16px;
}

.usage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-name {
  font-size: 14px;
  font-weight: 500;
  color: $text;
  width: 48px;
  flex-shrink: 0;
}

.usage-bar {
  flex: 1;
  height: 8px;
  background: rgba(0,0,0,0.04);
  border-radius: 4px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  background: linear-gradient(90deg, $accent, $accent-deep);
  border-radius: 4px;
  transition: width 0.3s $ease-apple;
}

.usage-count {
  font-size: 13px;
  color: $text-secondary;
  width: 48px;
  text-align: right;
  flex-shrink: 0;
}

.empty-card {
  text-align: center;
  padding: 40px 0;
  color: $text-muted;
  font-size: 14px;
}

.trend-card {
  grid-column: 1 / -1;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .card-title {
    margin-bottom: 0;
  }
}

.trend-svg {
  width: 100%;
  height: auto;
  display: block;
}

.chart-label {
  font-size: 11px;
  fill: $text-muted;
  font-family: $font-sans;
}

.chart-legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: $text-secondary;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>
