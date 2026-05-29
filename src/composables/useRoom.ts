import { ref } from 'vue'
import { useSupabase } from './useSupabase'

export interface Room {
  id: number
  name: string
  capacity_min: number
  capacity_max: number
  type: string
  hourly_rate: number
  image_url: string
  is_active: boolean
}

export function useRoom() {
  const rooms = ref<Room[]>([])
  const loading = ref(false)
  const { supabase } = useSupabase()

  async function fetchRooms() {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('id')
      if (err) throw err
      rooms.value = data || []
    } catch (e) {
      console.error('Failed to fetch rooms:', e)
    } finally {
      loading.value = false
    }
  }

  return { rooms, loading, fetchRooms }
}
