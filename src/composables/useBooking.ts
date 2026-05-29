import { ref } from 'vue'
import { useSupabase } from './useSupabase'

export interface Booking {
  id: number
  room_id: number
  package_id: number
  customer_id: number | null
  booking_date: string
  start_time: string
  end_time: string
  actual_end_time: string | null
  overtime_hours: number
  overtime_fee: number
  package_fee: number
  addons_fee: number
  total_amount: number
  tea_amount: number
  status: 'booked' | 'in_progress' | 'completed' | 'cancelled'
  payment_status: 'unpaid' | 'paid'
  payment_method: string | null
  notes: string | null
  created_at: string
  // Joined fields
  room_name?: string
  package_name?: string
  customer_name?: string
  customer_phone?: string
}

export interface CreateBookingParams {
  room_id: number
  package_id: number
  customer_id?: number
  booking_date: string
  start_time: string
  end_time: string
  notes?: string
  /** 初始状态，默认 'booked'。散客开单时传 'in_progress' */
  initial_status?: Booking['status']
}

export function useBooking() {
  const bookings = ref<Booking[]>([])
  const currentBooking = ref<Booking | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { supabase } = useSupabase()

  function flattenBooking(b: any): Booking {
    return {
      ...b,
      room_name: b.rooms?.name || '',
      package_name: b.packages?.name || '',
      customer_name: b.customers?.name || '',
      customer_phone: b.customers?.phone || '',
    }
  }

  async function fetchBookings(filters?: {
    date?: string
    status?: string
    room_id?: number
  }) {
    loading.value = true
    try {
      let query = supabase
        .from('bookings')
        .select('*, rooms(name), packages(name), customers(name, phone)')
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (filters?.date) query = query.eq('booking_date', filters.date)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.room_id) query = query.eq('room_id', filters.room_id)

      const { data, error: err } = await query
      if (err) throw err
      bookings.value = (data || []).map(flattenBooking)
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchBookingById(id: number) {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('bookings')
        .select('*, rooms(name), packages(name), customers(name, phone)')
        .eq('id', id)
        .single()
      if (err) throw err
      currentBooking.value = data ? flattenBooking(data) : null
      return currentBooking.value
    } catch (e) {
      error.value = String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createBooking(params: CreateBookingParams) {
    loading.value = true
    try {
      // Get package price
      const { data: pkg } = await supabase
        .from('packages')
        .select('price')
        .eq('id', params.package_id)
        .single()
      const packageFee = pkg?.price || 0

      const { data: result, error: err } = await supabase
        .from('bookings')
        .insert({
          room_id: params.room_id,
          package_id: params.package_id,
          customer_id: params.customer_id || null,
          booking_date: params.booking_date,
          start_time: params.start_time,
          end_time: params.end_time,
          package_fee: packageFee,
          total_amount: packageFee,
          status: params.initial_status || 'booked',
        })
        .select('id')
        .single()
      if (err) throw err
      return result?.id
    } catch (e) {
      error.value = String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateBookingStatus(id: number, status: Booking['status']) {
    try {
      const { error: err } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)
      if (err) throw err
      await fetchBookings()
    } catch (e) {
      error.value = String(e)
    }
  }

  async function cancelBooking(id: number) {
    return updateBookingStatus(id, 'cancelled')
  }

  async function checkIn(id: number) {
    try {
      // Get booking with package info
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, packages(duration_hours)')
        .eq('id', id)
        .single()
      if (!booking) throw new Error('Booking not found')

      // Recalculate end_time based on check-in time + package duration
      const now = new Date()
      const startHH = String(now.getHours()).padStart(2, '0')
      const startMM = String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')
      const startTime = `${startHH}:${startMM}`
      const duration = (booking.packages as any)?.duration_hours || 2
      const [h, m] = startTime.split(':').map(Number)
      const totalMinutes = h * 60 + m + duration * 60
      const endH = Math.floor(totalMinutes / 60) % 24
      const endM = totalMinutes % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

      const { error: err } = await supabase
        .from('bookings')
        .update({ status: 'in_progress', start_time: startTime, end_time: endTime })
        .eq('id', id)
      if (err) throw err
      await fetchBookings()
    } catch (e) {
      error.value = String(e)
    }
  }

  async function extendBooking(id: number, hours: number) {
    try {
      // Get current booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('end_time, room_id, rooms(hourly_rate)')
        .eq('id', id)
        .single()
      if (!booking) throw new Error('Booking not found')

      // Calculate new end_time
      const [h, m] = booking.end_time.split(':').map(Number)
      const totalMinutes = h * 60 + m + hours * 60
      const newH = Math.floor(totalMinutes / 60) % 24
      const newM = totalMinutes % 60
      const newEndTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`

      // Calculate overtime fee for the extended hours
      const hourlyRate = (booking.rooms as any)?.hourly_rate || 60
      const overtimeFee = hours * hourlyRate

      const { error: err } = await supabase
        .from('bookings')
        .update({
          end_time: newEndTime,
          overtime_hours: hours,
          overtime_fee: overtimeFee,
        })
        .eq('id', id)
      if (err) throw err
      await fetchBookings()
      return { newEndTime, overtimeFee }
    } catch (e) {
      error.value = String(e)
      return null
    }
  }

  async function completeBooking(id: number) {
    try {
      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const { error: err } = await supabase
        .from('bookings')
        .update({ status: 'completed', actual_end_time: timeStr })
        .eq('id', id)
      if (err) throw err
      await fetchBookings()
    } catch (e) {
      error.value = String(e)
    }
  }

  return {
    bookings,
    currentBooking,
    loading,
    error,
    fetchBookings,
    fetchBookingById,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    checkIn,
    extendBooking,
    completeBooking,
  }
}
