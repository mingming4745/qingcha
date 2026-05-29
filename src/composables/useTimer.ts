import { ref, onUnmounted } from 'vue'

export interface TimerState {
  roomId: number
  roomName: string
  bookingId: number
  startTime: string
  endTime: string
  status: 'idle' | 'active' | 'warning' | 'overtime'
  remainingMinutes: number
  remainingDisplay: string
  overtimeMinutes: number
}

export function useTimer() {
  const timers = ref<TimerState[]>([])
  let intervalId: ReturnType<typeof setInterval> | null = null

  function updateTimers() {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    for (const timer of timers.value) {
      if (timer.status === 'idle') continue

      const endMinutes = timeToMinutes(timer.endTime)
      const currentMinutes = timeToMinutes(currentTime)
      const diff = endMinutes - currentMinutes

      if (diff <= 0) {
        // Overtime
        timer.status = 'overtime'
        timer.overtimeMinutes = Math.abs(diff)
        timer.remainingMinutes = 0
        timer.remainingDisplay = `超时 ${Math.abs(diff)} 分钟`
      } else if (diff <= 15) {
        // Warning: 15 minutes or less
        timer.status = 'warning'
        timer.remainingMinutes = diff
        timer.overtimeMinutes = 0
        timer.remainingDisplay = `剩余 ${diff} 分钟`
      } else {
        // Active
        timer.status = 'active'
        timer.remainingMinutes = diff
        timer.overtimeMinutes = 0
        const hours = Math.floor(diff / 60)
        const mins = diff % 60
        timer.remainingDisplay = hours > 0 ? `剩余 ${hours}小时${mins}分钟` : `剩余 ${mins}分钟`
      }
    }
  }

  function startTimer() {
    if (intervalId) return
    updateTimers()
    intervalId = setInterval(updateTimers, 30000) // Update every 30 seconds
  }

  function stopTimer() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function setTimers(newTimers: TimerState[]) {
    timers.value = newTimers
    updateTimers()
  }

  function addTimer(timer: TimerState) {
    const existing = timers.value.findIndex(t => t.bookingId === timer.bookingId)
    if (existing >= 0) {
      timers.value[existing] = timer
    } else {
      timers.value.push(timer)
    }
    updateTimers()
  }

  function removeTimer(bookingId: number) {
    timers.value = timers.value.filter(t => t.bookingId !== bookingId)
  }

  function getRoomTimer(roomId: number): TimerState | undefined {
    return timers.value.find(t => t.roomId === roomId)
  }

  onUnmounted(() => {
    stopTimer()
  })

  return {
    timers,
    startTimer,
    stopTimer,
    setTimers,
    addTimer,
    removeTimer,
    getRoomTimer,
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
