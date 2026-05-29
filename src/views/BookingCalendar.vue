<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useBooking } from '../composables/useBooking'
import { Calendar } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg } from '@fullcalendar/core'

const router = useRouter()
const { bookings, fetchBookings } = useBooking()

const calendarEl = ref<HTMLElement | null>(null)
const calendar = shallowRef<Calendar | null>(null)

const statusColors: Record<string, string> = {
  booked: '#6366F1',
  in_progress: '#34D399',
  completed: '#94A3B8',
  cancelled: '#FCA5A5',
}

const statusLabels: Record<string, string> = {
  booked: '已预约',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

async function loadEvents() {
  await fetchBookings()
  const events: EventInput[] = bookings.value.map(b => ({
    id: String(b.id),
    title: `${b.room_name} · ${b.customer_name || '散客'}`,
    start: `${b.booking_date}T${b.start_time}`,
    end: `${b.booking_date}T${b.end_time}`,
    backgroundColor: statusColors[b.status] || '#94A3B8',
    borderColor: 'transparent',
    extendedProps: {
      status: b.status,
      package_name: b.package_name,
      room_name: b.room_name,
    },
  }))

  if (calendar.value) {
    calendar.value.removeAllEvents()
    calendar.value.addEventSource(events)
  }
}

function handleEventClick(info: EventClickArg) {
  const id = info.event.id
  router.push(`/app/bookings/${id}`)
}

onMounted(() => {
  if (!calendarEl.value) return

  calendar.value = new Calendar(calendarEl.value, {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'zh-cn',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    buttonText: {
      today: '今天',
      month: '月',
      week: '周',
      day: '日',
    },
    height: 'auto',
    navLinks: true,
    editable: false,
    dayMaxEvents: 3,
    eventClick: handleEventClick,
    eventDisplay: 'block',
    views: {
      timeGridWeek: {
        slotMinTime: '08:00:00',
        slotMaxTime: '24:00:00',
        allDaySlot: false,
      },
      timeGridDay: {
        slotMinTime: '08:00:00',
        slotMaxTime: '24:00:00',
        allDaySlot: false,
      },
    },
  })

  calendar.value.render()
  loadEvents()
})
</script>

<template>
  <div class="booking-calendar">
    <div class="action-bar glass-panel">
      <div class="legend">
        <span v-for="(color, status) in statusColors" :key="status" class="legend-item">
          <i class="legend-dot" :style="{ background: color }" />
          {{ statusLabels[status] }}
        </span>
      </div>
      <el-button @click="loadEvents">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>
    <div class="calendar-wrapper">
      <div ref="calendarEl" class="calendar-el" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.booking-calendar {
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

.legend {
  display: flex;
  gap: 16px;
  align-items: center;
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

.calendar-wrapper {
  background: rgba(255, 255, 255, 0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 20px;
  overflow: hidden;
}

.calendar-el {
  --fc-border-color: rgba(0, 0, 0, 0.06);
  --fc-today-bg-color: rgba(52, 211, 153, 0.04);
  --fc-event-border-color: transparent;
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: transparent;
  --fc-list-event-hover-bg-color: rgba(0, 0, 0, 0.02);

  :deep(.fc) {
    font-family: $font-sans;
  }

  :deep(.fc-toolbar-title) {
    font-size: 18px;
    font-weight: 600;
    color: $text;
  }

  :deep(.fc-button) {
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.08);
    color: $text-secondary;
    font-size: 13px;
    font-weight: 500;
    border-radius: $radius-xs;
    padding: 6px 12px;
    transition: all 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    &.fc-button-active {
      background: $accent;
      border-color: $accent;
      color: #fff;
    }
  }

  :deep(.fc-daygrid-day-number) {
    font-size: 14px;
    font-weight: 500;
    color: $text;
    padding: 8px 12px;
  }

  :deep(.fc-col-header-cell-cushion) {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
    padding: 10px 0;
  }

  :deep(.fc-event) {
    cursor: pointer;
    padding: 2px 6px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px !important;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.85;
    }
  }

  :deep(.fc-daygrid-event) {
    margin: 1px 2px;
  }

  :deep(.fc-timegrid-slot) {
    height: 40px;
  }

  :deep(.fc-timegrid-slot-label-cushion) {
    font-size: 12px;
    color: $text-muted;
  }

  :deep(.fc-popover) {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: $radius-sm;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  :deep(.fc-popover-header) {
    background: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
  }
}
</style>
