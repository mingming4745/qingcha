import { ref } from 'vue'
import { useSupabase } from './useSupabase'

export interface Package {
  id: number
  name: string
  price: number
  original_price: number | null
  duration_hours: number
  max_guests: number
  tea_count: number
  snack_dry_count: number
  snack_pastry_count: number
  includes_parking: boolean
  parking_hours: number
  spend_threshold: number | null
  is_active: boolean
}

export function usePackage() {
  const packages = ref<Package[]>([])
  const loading = ref(false)
  const { supabase } = useSupabase()

  async function fetchPackages() {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('price')
      if (err) throw err
      packages.value = data || []
    } catch (e) {
      console.error('Failed to fetch packages:', e)
    } finally {
      loading.value = false
    }
  }

  async function getPackageRooms(packageId: number) {
    const { data, error: err } = await supabase
      .from('package_rooms')
      .select('rooms(id, name)')
      .eq('package_id', packageId)
    if (err) throw err
    return (data || []).map((pr: any) => ({ id: pr.rooms.id, name: pr.rooms.name }))
  }

  return { packages, loading, fetchPackages, getPackageRooms }
}
