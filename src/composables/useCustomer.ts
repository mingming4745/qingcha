import { ref } from 'vue'
import { useSupabase } from './useSupabase'

export interface Customer {
  id: number
  name: string
  phone: string
  notes: string | null
  total_spent: number
  visit_count: number
  created_at: string
}

export function useCustomer() {
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const { supabase } = useSupabase()

  async function fetchCustomers(keyword?: string) {
    loading.value = true
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (keyword) {
        query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%`)
      }

      const { data, error: err } = await query
      if (err) throw err
      customers.value = data || []
    } catch (e) {
      console.error('Failed to fetch customers:', e)
    } finally {
      loading.value = false
    }
  }

  async function createCustomer(data: { name: string; phone: string; notes?: string }) {
    const { data: result, error: err } = await supabase
      .from('customers')
      .insert({ name: data.name, phone: data.phone, notes: data.notes || null })
      .select('id')
      .single()
    if (err) throw err
    return result?.id
  }

  async function updateCustomer(id: number, data: { name: string; phone: string; notes?: string }) {
    const { error: err } = await supabase
      .from('customers')
      .update({ name: data.name, phone: data.phone, notes: data.notes || null })
      .eq('id', id)
    if (err) throw err
  }

  async function deleteCustomer(id: number) {
    const { error: err } = await supabase.from('customers').delete().eq('id', id)
    if (err) throw err
  }

  async function getCustomerBookings(customerId: number) {
    const { data, error: err } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, total_amount, status, rooms(name), packages(name)')
      .eq('customer_id', customerId)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(20)
    if (err) throw err
    return (data || []).map((b: any) => ({
      id: b.id,
      booking_date: b.booking_date,
      start_time: b.start_time,
      end_time: b.end_time,
      total_amount: b.total_amount,
      status: b.status,
      room_name: b.rooms?.name || '',
      package_name: b.packages?.name || '',
    }))
  }

  return { customers, loading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerBookings }
}
