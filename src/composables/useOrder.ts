import { ref } from 'vue'
import { useSupabase } from './useSupabase'

export interface OrderItem {
  id: number
  booking_id: number
  product_id: number
  name: string
  category: string
  price: number
  quantity: number
  created_at: string
}

export interface Product {
  id: number
  name: string
  category: string
  price: number
  unit: string
  image_url: string
}

export function useOrder() {
  const orderItems = ref<OrderItem[]>([])
  const products = ref<Product[]>([])
  const loading = ref(false)
  const { supabase } = useSupabase()

  async function fetchOrderItems(bookingId: number) {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('order_items')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at')
      if (err) throw err
      orderItems.value = data || []
    } catch (e) {
      console.error('Failed to fetch order items:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchProducts(category?: string) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name')
      if (category) query = query.eq('category', category)
      const { data, error: err } = await query
      if (err) throw err
      products.value = data || []
    } catch (e) {
      console.error('Failed to fetch products:', e)
    }
  }

  async function addOrderItem(bookingId: number, product: Product, quantity: number = 1) {
    try {
      const { error: err } = await supabase
        .from('order_items')
        .insert({
          booking_id: bookingId,
          product_id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          quantity,
        })
      if (err) throw err
      await updateBookingAddonsFee(bookingId)
      await fetchOrderItems(bookingId)
    } catch (e) {
      console.error('Failed to add order item:', e)
    }
  }

  async function removeOrderItem(itemId: number, bookingId: number) {
    try {
      const { error: err } = await supabase.from('order_items').delete().eq('id', itemId)
      if (err) throw err
      await updateBookingAddonsFee(bookingId)
      await fetchOrderItems(bookingId)
    } catch (e) {
      console.error('Failed to remove order item:', e)
    }
  }

  async function updateOrderItemQuantity(itemId: number, bookingId: number, quantity: number) {
    try {
      if (quantity <= 0) {
        await removeOrderItem(itemId, bookingId)
      } else {
        const { error: err } = await supabase
          .from('order_items')
          .update({ quantity })
          .eq('id', itemId)
        if (err) throw err
        await updateBookingAddonsFee(bookingId)
        await fetchOrderItems(bookingId)
      }
    } catch (e) {
      console.error('Failed to update order item:', e)
    }
  }

  async function updateBookingAddonsFee(bookingId: number) {
    const { data: items } = await supabase
      .from('order_items')
      .select('price, quantity, category')
      .eq('booking_id', bookingId)

    const addonsFee = (items || []).reduce((sum, i) => sum + i.price * i.quantity, 0)
    const teaAmount = (items || [])
      .filter(i => i.category === 'tea')
      .reduce((sum, i) => sum + i.price * i.quantity, 0)

    await supabase
      .from('bookings')
      .update({ addons_fee: addonsFee, tea_amount: teaAmount, total_amount: undefined })
      .eq('id', bookingId)

    // Recalculate total_amount = package_fee + addons_fee
    const { data: booking } = await supabase
      .from('bookings')
      .select('package_fee')
      .eq('id', bookingId)
      .single()

    if (booking) {
      await supabase
        .from('bookings')
        .update({ total_amount: booking.package_fee + addonsFee })
        .eq('id', bookingId)
    }
  }

  return {
    orderItems,
    products,
    loading,
    fetchOrderItems,
    fetchProducts,
    addOrderItem,
    removeOrderItem,
    updateOrderItemQuantity,
  }
}
