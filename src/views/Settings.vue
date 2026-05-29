<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSupabase } from '../composables/useSupabase'
import { useRoom, type Room } from '../composables/useRoom'
import { usePackage, type Package } from '../composables/usePackage'
import { useOrder, type Product } from '../composables/useOrder'

const { supabase } = useSupabase()
const { rooms, fetchRooms } = useRoom()
const { packages, fetchPackages } = usePackage()
const { products, fetchProducts } = useOrder()

const activeTab = ref('rooms')

// ─── Room CRUD ───
const showRoomDialog = ref(false)
const editingRoom = ref<Partial<Room> | null>(null)

function openRoomDialog(room?: Room) {
  editingRoom.value = room ? { ...room } : { name: '', capacity_min: 2, capacity_max: 5, type: 'small', hourly_rate: 60, image_url: '' }
  showRoomDialog.value = true
}

async function saveRoom() {
  if (!editingRoom.value?.name) { ElMessage.warning('请输入包间名称'); return }
  if (editingRoom.value.id) {
    const { error: err } = await supabase
      .from('rooms')
      .update({
        name: editingRoom.value.name,
        capacity_min: editingRoom.value.capacity_min,
        capacity_max: editingRoom.value.capacity_max,
        type: editingRoom.value.type,
        hourly_rate: editingRoom.value.hourly_rate,
        image_url: editingRoom.value.image_url,
      })
      .eq('id', editingRoom.value.id)
    if (err) { ElMessage.error('更新失败'); return }
    ElMessage.success('已更新')
  } else {
    const { error: err } = await supabase
      .from('rooms')
      .insert({
        name: editingRoom.value.name,
        capacity_min: editingRoom.value.capacity_min,
        capacity_max: editingRoom.value.capacity_max,
        type: editingRoom.value.type,
        hourly_rate: editingRoom.value.hourly_rate,
        image_url: editingRoom.value.image_url,
      })
    if (err) { ElMessage.error('添加失败'); return }
    ElMessage.success('已添加')
  }
  showRoomDialog.value = false
  await fetchRooms()
}

async function deleteRoom(id: number) {
  try {
    await ElMessageBox.confirm('确定删除此包间？', '删除', { type: 'warning' })
    const { error: err } = await supabase.from('rooms').update({ is_active: false }).eq('id', id)
    if (err) { ElMessage.error('删除失败'); return }
    ElMessage.success('已删除')
    await fetchRooms()
  } catch {}
}

// ─── Package CRUD ───
const showPackageDialog = ref(false)
const editingPackage = ref<Partial<Package> | null>(null)

function openPackageDialog(pkg?: Package) {
  editingPackage.value = pkg ? { ...pkg } : {
    name: '', price: 0, duration_hours: 2, max_guests: 5,
    tea_count: 1, snack_dry_count: 2, snack_pastry_count: 2,
    includes_parking: true, parking_hours: 2, spend_threshold: 300,
  }
  showPackageDialog.value = true
}

async function savePackage() {
  if (!editingPackage.value?.name) { ElMessage.warning('请输入套餐名称'); return }
  const pkgData = {
    name: editingPackage.value.name,
    price: editingPackage.value.price,
    duration_hours: editingPackage.value.duration_hours,
    max_guests: editingPackage.value.max_guests,
    tea_count: editingPackage.value.tea_count,
    snack_dry_count: editingPackage.value.snack_dry_count,
    snack_pastry_count: editingPackage.value.snack_pastry_count,
    includes_parking: editingPackage.value.includes_parking,
    parking_hours: editingPackage.value.parking_hours,
    spend_threshold: editingPackage.value.spend_threshold,
  }
  if (editingPackage.value.id) {
    const { error: err } = await supabase.from('packages').update(pkgData).eq('id', editingPackage.value.id)
    if (err) { ElMessage.error('更新失败'); return }
    ElMessage.success('已更新')
  } else {
    const { error: err } = await supabase.from('packages').insert(pkgData)
    if (err) { ElMessage.error('添加失败'); return }
    ElMessage.success('已添加')
  }
  showPackageDialog.value = false
  await fetchPackages()
}

async function deletePackage(id: number) {
  try {
    await ElMessageBox.confirm('确定删除此套餐？', '删除', { type: 'warning' })
    const { error: err } = await supabase.from('packages').update({ is_active: false }).eq('id', id)
    if (err) { ElMessage.error('删除失败'); return }
    ElMessage.success('已删除')
    await fetchPackages()
  } catch {}
}

// ─── Product CRUD ───
const showProductDialog = ref(false)
const editingProduct = ref<Partial<Product> | null>(null)
const productFilter = ref('')

function openProductDialog(product?: Product) {
  editingProduct.value = product ? { ...product } : { name: '', category: 'tea', price: 0, unit: '壶', image_url: '' }
  showProductDialog.value = true
}

async function saveProduct() {
  if (!editingProduct.value?.name) { ElMessage.warning('请输入商品名称'); return }
  const prodData = {
    name: editingProduct.value.name,
    category: editingProduct.value.category,
    price: editingProduct.value.price,
    unit: editingProduct.value.unit,
    image_url: editingProduct.value.image_url,
  }
  if (editingProduct.value.id) {
    const { error: err } = await supabase.from('products').update(prodData).eq('id', editingProduct.value.id)
    if (err) { ElMessage.error('更新失败'); return }
    ElMessage.success('已更新')
  } else {
    const { error: err } = await supabase.from('products').insert(prodData)
    if (err) { ElMessage.error('添加失败'); return }
    ElMessage.success('已添加')
  }
  showProductDialog.value = false
  await fetchProducts()
}

async function deleteProduct(id: number) {
  try {
    await ElMessageBox.confirm('确定删除此商品？', '删除', { type: 'warning' })
    const { error: err } = await supabase.from('products').update({ is_active: false }).eq('id', id)
    if (err) { ElMessage.error('删除失败'); return }
    ElMessage.success('已删除')
    await fetchProducts()
  } catch {}
}

const filteredProducts = () => {
  if (!productFilter.value) return products.value
  return products.value.filter(p => p.category === productFilter.value)
}

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = { tea: '茶水', snack: '茶点', meal: '简餐' }
  return map[cat] || cat
}

// ─── Data Export ───
async function exportAllData() {
  const tables = ['rooms', 'packages', 'package_rooms', 'products', 'customers', 'bookings', 'order_items', 'inventory', 'inventory_logs']
  const exportData: Record<string, any[]> = {}

  for (const table of tables) {
    const { data } = await supabase.from(table).select('*')
    exportData[table] = data || []
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qingcha-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

onMounted(async () => {
  await Promise.all([fetchRooms(), fetchPackages(), fetchProducts()])
})
</script>

<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- 包间管理 -->
      <el-tab-pane label="包间管理" name="rooms">
        <div class="tab-header">
          <h3>包间列表</h3>
          <el-button type="primary" size="small" @click="openRoomDialog()">
            <el-icon><Plus /></el-icon> 添加包间
          </el-button>
        </div>
        <el-table :data="rooms" stripe>
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column label="容量" width="120">
            <template #default="{ row }">{{ row.capacity_min }}-{{ row.capacity_max }}人</template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">{{ row.type === 'small' ? '小型' : row.type === 'large' ? '大型' : '散座' }}</template>
          </el-table-column>
          <el-table-column label="超时费" width="120">
            <template #default="{ row }">¥{{ row.hourly_rate }}/小时</template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" text @click="openRoomDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" text @click="deleteRoom(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 套餐管理 -->
      <el-tab-pane label="套餐管理" name="packages">
        <div class="tab-header">
          <h3>套餐列表</h3>
          <el-button type="primary" size="small" @click="openPackageDialog()">
            <el-icon><Plus /></el-icon> 添加套餐
          </el-button>
        </div>
        <el-table :data="packages" stripe>
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column label="价格" width="100">
            <template #default="{ row }">¥{{ row.price }}</template>
          </el-table-column>
          <el-table-column label="时长" width="80">
            <template #default="{ row }">{{ row.duration_hours }}h</template>
          </el-table-column>
          <el-table-column label="人数" width="80">
            <template #default="{ row }">{{ row.max_guests }}人</template>
          </el-table-column>
          <el-table-column label="达标免超时" width="120">
            <template #default="{ row }">{{ row.spend_threshold ? '¥' + row.spend_threshold : '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" text @click="openPackageDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" text @click="deletePackage(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 商品管理 -->
      <el-tab-pane label="商品管理" name="products">
        <div class="tab-header">
          <h3>商品列表</h3>
          <div class="tab-header-right">
            <el-select v-model="productFilter" placeholder="全部分类" clearable size="small" style="width: 120px">
              <el-option label="茶水" value="tea" />
              <el-option label="茶点" value="snack" />
              <el-option label="简餐" value="meal" />
            </el-select>
            <el-button type="primary" size="small" @click="openProductDialog()">
              <el-icon><Plus /></el-icon> 添加商品
            </el-button>
          </div>
        </div>
        <el-table :data="filteredProducts()" stripe>
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column label="分类" width="80">
            <template #default="{ row }">{{ getCategoryLabel(row.category) }}</template>
          </el-table-column>
          <el-table-column label="价格" width="100">
            <template #default="{ row }">¥{{ row.price }}</template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" width="60" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" text @click="openProductDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" text @click="deleteProduct(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 数据管理 -->
      <el-tab-pane label="数据管理" name="data">
        <div class="tab-header">
          <h3>数据导出</h3>
        </div>
        <p style="color: #6E6E73; margin-bottom: 16px;">导出所有数据为 JSON 文件，可用于备份或数据迁移。</p>
        <el-button type="primary" @click="exportAllData">
          <el-icon><Download /></el-icon> 导出全部数据
        </el-button>
      </el-tab-pane>
    </el-tabs>

    <!-- 包间编辑弹窗 -->
    <el-dialog v-model="showRoomDialog" :title="editingRoom?.id ? '编辑包间' : '添加包间'" width="480px">
      <el-form v-if="editingRoom" :model="editingRoom" label-position="top">
        <el-form-item label="包间名称" required>
          <el-input v-model="editingRoom.name" placeholder="如：望岫" />
        </el-form-item>
        <div style="display: flex; gap: 16px">
          <el-form-item label="最小人数" style="flex: 1">
            <el-input-number v-model="editingRoom.capacity_min" :min="1" :max="20" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最大人数" style="flex: 1">
            <el-input-number v-model="editingRoom.capacity_max" :min="1" :max="20" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="类型">
          <el-select v-model="editingRoom.type" style="width: 100%">
            <el-option label="小型包间" value="small" />
            <el-option label="大型包间" value="large" />
            <el-option label="散座" value="open" />
          </el-select>
        </el-form-item>
        <el-form-item label="超时费（元/小时）">
          <el-input-number v-model="editingRoom.hourly_rate" :min="0" :step="10" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRoomDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>

    <!-- 套餐编辑弹窗 -->
    <el-dialog v-model="showPackageDialog" :title="editingPackage?.id ? '编辑套餐' : '添加套餐'" width="520px">
      <el-form v-if="editingPackage" :model="editingPackage" label-position="top">
        <el-form-item label="套餐名称" required>
          <el-input v-model="editingPackage.name" placeholder="如：2-5人品茗套餐" />
        </el-form-item>
        <div style="display: flex; gap: 16px">
          <el-form-item label="价格（元）" style="flex: 1">
            <el-input-number v-model="editingPackage.price" :min="0" :step="10" style="width: 100%" />
          </el-form-item>
          <el-form-item label="时长（小时）" style="flex: 1">
            <el-input-number v-model="editingPackage.duration_hours" :min="1" :max="8" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="最大人数">
          <el-input-number v-model="editingPackage.max_guests" :min="1" :max="20" style="width: 100%" />
        </el-form-item>
        <div style="display: flex; gap: 16px">
          <el-form-item label="可选茶品数" style="flex: 1">
            <el-input-number v-model="editingPackage.tea_count" :min="0" :max="5" style="width: 100%" />
          </el-form-item>
          <el-form-item label="干果份数" style="flex: 1">
            <el-input-number v-model="editingPackage.snack_dry_count" :min="0" :max="5" style="width: 100%" />
          </el-form-item>
          <el-form-item label="点心份数" style="flex: 1">
            <el-input-number v-model="editingPackage.snack_pastry_count" :min="0" :max="5" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="达标免超时金额（仅茶水消费）">
          <el-input-number v-model="editingPackage.spend_threshold" :min="0" :step="100" style="width: 100%" placeholder="不填则无免超时" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPackageDialog = false">取消</el-button>
        <el-button type="primary" @click="savePackage">保存</el-button>
      </template>
    </el-dialog>

    <!-- 商品编辑弹窗 -->
    <el-dialog v-model="showProductDialog" :title="editingProduct?.id ? '编辑商品' : '添加商品'" width="480px">
      <el-form v-if="editingProduct" :model="editingProduct" label-position="top">
        <el-form-item label="商品名称" required>
          <el-input v-model="editingProduct.name" placeholder="如：云南普洱" />
        </el-form-item>
        <div style="display: flex; gap: 16px">
          <el-form-item label="分类" style="flex: 1">
            <el-select v-model="editingProduct.category" style="width: 100%">
              <el-option label="茶水" value="tea" />
              <el-option label="茶点" value="snack" />
              <el-option label="简餐" value="meal" />
            </el-select>
          </el-form-item>
          <el-form-item label="单位" style="flex: 1">
            <el-input v-model="editingProduct.unit" placeholder="壶/份/杯" />
          </el-form-item>
        </div>
        <el-form-item label="价格（元）">
          <el-input-number v-model="editingProduct.price" :min="0" :step="5" style="width: 100%" />
        </el-form-item>
        <el-form-item label="图片路径">
          <el-input v-model="editingProduct.image_url" placeholder="/images/products/tea/xxx.jpg" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProductDialog = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.settings-page {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 24px;
}

.settings-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 24px;
  }
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: $text;
  }
}

.tab-header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
