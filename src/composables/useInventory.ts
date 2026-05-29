import { ref } from 'vue'
import { useSupabase } from './useSupabase'

export interface InventoryItem {
  id: number
  name: string
  category: string
  unit: string
  stock_quantity: number
  alert_threshold: number
  cost_price: number
  updated_at: string
}

export interface InventoryLog {
  id: number
  inventory_id: number
  change_type: string
  quantity: number
  reason: string
  created_at: string
}

export function useInventory() {
  const items = ref<InventoryItem[]>([])
  const logs = ref<InventoryLog[]>([])
  const loading = ref(false)
  const { supabase } = useSupabase()

  async function fetchItems(category?: string) {
    loading.value = true
    try {
      let query = supabase.from('inventory').select('*').order('name')
      if (category) query = query.eq('category', category)
      const { data, error: err } = await query
      if (err) throw err
      items.value = data || []
    } catch (e) {
      console.error('Failed to fetch inventory:', e)
    } finally {
      loading.value = false
    }
  }

  async function createItem(data: { name: string; category: string; unit: string; stock_quantity: number; alert_threshold: number; cost_price: number }) {
    const { error: err } = await supabase
      .from('inventory')
      .insert({
        name: data.name,
        category: data.category,
        unit: data.unit,
        stock_quantity: data.stock_quantity,
        alert_threshold: data.alert_threshold,
        cost_price: data.cost_price,
      })
    if (err) throw err
  }

  async function updateItem(id: number, data: { name: string; category: string; unit: string; alert_threshold: number; cost_price: number }) {
    const { error: err } = await supabase
      .from('inventory')
      .update({
        name: data.name,
        category: data.category,
        unit: data.unit,
        alert_threshold: data.alert_threshold,
        cost_price: data.cost_price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (err) throw err
  }

  async function stockIn(id: number, quantity: number, reason: string) {
    // Read current stock
    const { data: item } = await supabase
      .from('inventory')
      .select('stock_quantity')
      .eq('id', id)
      .single()

    const newQty = (item?.stock_quantity || 0) + quantity

    const { error: err1 } = await supabase
      .from('inventory')
      .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err1) throw err1

    const { error: err2 } = await supabase
      .from('inventory_logs')
      .insert({ inventory_id: id, change_type: 'in', quantity, reason })
    if (err2) throw err2
  }

  async function stockOut(id: number, quantity: number, reason: string) {
    const { data: item } = await supabase
      .from('inventory')
      .select('stock_quantity')
      .eq('id', id)
      .single()

    const newQty = Math.max(0, (item?.stock_quantity || 0) - quantity)

    const { error: err1 } = await supabase
      .from('inventory')
      .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err1) throw err1

    const { error: err2 } = await supabase
      .from('inventory_logs')
      .insert({ inventory_id: id, change_type: 'out', quantity, reason })
    if (err2) throw err2
  }

  async function fetchLogs(inventoryId: number) {
    const { data, error: err } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (err) throw err
    logs.value = data || []
  }

  async function deleteItem(id: number) {
    const { error: err } = await supabase.from('inventory').delete().eq('id', id)
    if (err) throw err
  }

  return { items, logs, loading, fetchItems, createItem, updateItem, stockIn, stockOut, fetchLogs, deleteItem }
}
