<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInventory, type InventoryItem } from '../composables/useInventory'
import { useOrder } from '../composables/useOrder'

const { items, logs, loading, fetchItems, createItem, updateItem, stockIn, stockOut, fetchLogs, deleteItem } = useInventory()
const { products, fetchProducts } = useOrder()

const filterCategory = ref('')
const showDialog = ref(false)
const editingItem = ref<Partial<InventoryItem> | null>(null)
const showStockDialog = ref(false)
const stockAction = ref<'in' | 'out'>('in')
const stockItemId = ref(0)
const stockQuantity = ref(0)
const stockReason = ref('')
const showLogs = ref(false)
const logItemName = ref('')

const lowStockCount = computed(() => items.value.filter(i => i.stock_quantity <= i.alert_threshold && i.alert_threshold > 0).length)

function openDialog(item?: InventoryItem) {
  editingItem.value = item ? { ...item } : { name: '', category: 'tea', unit: '斤', stock_quantity: 0, alert_threshold: 0, cost_price: 0 }
  showDialog.value = true
}

function onProductSelect(productName: string) {
  if (!editingItem.value) return
  const product = products.value.find(p => p.name === productName)
  if (product) {
    editingItem.value.name = product.name
    editingItem.value.category = product.category === 'tea' ? 'tea' : product.category === 'snack' ? 'snack' : product.category === 'meal' ? 'meal' : 'other'
    editingItem.value.unit = product.unit || '斤'
  }
}

async function handleSave() {
  if (!editingItem.value?.name) { ElMessage.warning('请输入名称'); return }
  if (editingItem.value.id) {
    await updateItem(editingItem.value.id, editingItem.value as any)
    ElMessage.success('已更新')
  } else {
    await createItem(editingItem.value as any)
    ElMessage.success('已添加')
  }
  showDialog.value = false
  await fetchItems(filterCategory.value)
}

function openStockDialog(item: InventoryItem, action: 'in' | 'out') {
  stockItemId.value = item.id
  stockAction.value = action
  stockQuantity.value = 0
  stockReason.value = ''
  showStockDialog.value = true
}

async function handleStock() {
  if (stockQuantity.value <= 0) { ElMessage.warning('请输入数量'); return }
  if (stockAction.value === 'in') {
    await stockIn(stockItemId.value, stockQuantity.value, stockReason.value || '入库')
    ElMessage.success('入库成功')
  } else {
    await stockOut(stockItemId.value, stockQuantity.value, stockReason.value || '出库')
    ElMessage.success('出库成功')
  }
  showStockDialog.value = false
  await fetchItems(filterCategory.value)
}

async function openLogs(item: InventoryItem) {
  logItemName.value = item.name
  await fetchLogs(item.id)
  showLogs.value = true
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除此库存项？', '删除', { type: 'warning' })
    await deleteItem(id)
    ElMessage.success('已删除')
    await fetchItems(filterCategory.value)
  } catch {}
}

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = { tea: '茶叶', snack: '茶点原料', meal: '简餐原料', other: '其他' }
  return map[cat] || cat
}

onMounted(async () => {
  await Promise.all([fetchItems(), fetchProducts()])
})
</script>

<template>
  <div class="inventory-page">
    <div class="action-bar glass-panel">
      <div class="filters">
        <el-select v-model="filterCategory" placeholder="全部分类" clearable @change="fetchItems(filterCategory)">
          <el-option label="茶叶" value="tea" />
          <el-option label="茶点原料" value="snack" />
          <el-option label="简餐原料" value="meal" />
          <el-option label="其他" value="other" />
        </el-select>
        <el-tag v-if="lowStockCount > 0" type="danger" effect="plain">{{ lowStockCount }} 项库存不足</el-tag>
      </div>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon> 添加库存
      </el-button>
    </div>

    <div class="inventory-list">
      <el-table :data="items" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">{{ getCategoryLabel(row.category) }}</template>
        </el-table-column>
        <el-table-column label="库存量" width="120" align="center">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock_quantity <= row.alert_threshold && row.alert_threshold > 0 }">
              {{ row.stock_quantity }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="预警线" width="100" align="center">
          <template #default="{ row }">{{ row.alert_threshold }} {{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="成本价" width="90" align="right">
          <template #default="{ row }">¥{{ row.cost_price }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" text @click="openStockDialog(row, 'in')">入库</el-button>
            <el-button size="small" type="warning" text @click="openStockDialog(row, 'out')">出库</el-button>
            <el-button size="small" text @click="openLogs(row)">记录</el-button>
            <el-button size="small" text @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" text @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && items.length === 0" class="empty-state">
        <el-icon :size="48" class="empty-icon"><Box /></el-icon>
        <h3>暂无库存</h3>
        <p>点击"添加库存"开始管理您的库存</p>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingItem?.id ? '编辑库存' : '添加库存'" width="480px">
      <el-form v-if="editingItem" :model="editingItem" label-position="top">
        <el-form-item label="关联商品" required>
          <el-select
            v-model="editingItem.name"
            placeholder="选择商品"
            filterable
            allow-create
            clearable
            style="width: 100%"
            @change="onProductSelect"
          >
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="`${p.name} (${p.category === 'tea' ? '茶水' : p.category === 'snack' ? '茶点' : '简餐'})`"
              :value="p.name"
            />
          </el-select>
        </el-form-item>
        <div style="display: flex; gap: 16px">
          <el-form-item label="分类" style="flex: 1">
            <el-select v-model="editingItem.category" style="width: 100%">
              <el-option label="茶叶" value="tea" />
              <el-option label="茶点原料" value="snack" />
              <el-option label="简餐原料" value="meal" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="单位" style="flex: 1">
            <el-input v-model="editingItem.unit" placeholder="斤/袋/箱" />
          </el-form-item>
        </div>
        <el-form-item label="初始库存" v-if="!editingItem.id">
          <el-input-number v-model="editingItem.stock_quantity" :min="0" style="width: 100%" />
        </el-form-item>
        <div style="display: flex; gap: 16px">
          <el-form-item label="预警线" style="flex: 1">
            <el-input-number v-model="editingItem.alert_threshold" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="成本价（元）" style="flex: 1">
            <el-input-number v-model="editingItem.cost_price" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 入库/出库弹窗 -->
    <el-dialog v-model="showStockDialog" :title="stockAction === 'in' ? '入库' : '出库'" width="400px">
      <el-form label-position="top">
        <el-form-item label="数量" required>
          <el-input-number v-model="stockQuantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="stockReason" :placeholder="stockAction === 'in' ? '如：采购入库' : '如：日常消耗'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showStockDialog = false">取消</el-button>
        <el-button type="primary" @click="handleStock">确认</el-button>
      </template>
    </el-dialog>

    <!-- 变动记录弹窗 -->
    <el-dialog v-model="showLogs" :title="`${logItemName} — 变动记录`" width="560px">
      <el-table :data="logs" stripe size="small" v-if="logs.length > 0">
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.change_type === 'in' ? 'success' : 'warning'" size="small">
              {{ row.change_type === 'in' ? '入库' : row.change_type === 'out' ? '出库' : '调整' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="reason" label="原因" min-width="120" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.created_at }}</template>
        </el-table-column>
      </el-table>
      <div v-else class="empty-history">暂无变动记录</div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.inventory-page {
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

.inventory-list {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 4px;
  overflow: hidden;
}

.low-stock {
  color: $danger;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  .empty-icon { color: $text-muted; margin-bottom: 16px; }
  h3 { font-size: 18px; font-weight: 600; color: $text; margin-bottom: 8px; }
  p { font-size: 14px; color: $text-secondary; }
}

.empty-history {
  text-align: center;
  padding: 40px 0;
  color: $text-muted;
  font-size: 14px;
}
</style>
