<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCustomer, type Customer } from '../composables/useCustomer'

const { customers, loading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerBookings } = useCustomer()

const keyword = ref('')
const showDialog = ref(false)
const editingCustomer = ref<Partial<Customer> | null>(null)
const showHistory = ref(false)
const historyCustomer = ref<Customer | null>(null)
const historyBookings = ref<{ id: number; booking_date: string; start_time: string; end_time: string; room_name: string; package_name: string; total_amount: number; status: string }[]>([])

function openDialog(customer?: Customer) {
  editingCustomer.value = customer ? { ...customer } : { name: '', phone: '', notes: '' }
  showDialog.value = true
}

async function handleSave() {
  if (!editingCustomer.value?.name) { ElMessage.warning('请输入姓名'); return }
  if (!editingCustomer.value?.phone) { ElMessage.warning('请输入手机号'); return }
  if (editingCustomer.value.phone.length !== 11) { ElMessage.warning('请输入 11 位手机号'); return }

  if (editingCustomer.value.id) {
    await updateCustomer(editingCustomer.value.id, editingCustomer.value as { name: string; phone: string; notes?: string })
    ElMessage.success('已更新')
  } else {
    await createCustomer(editingCustomer.value as { name: string; phone: string; notes?: string })
    ElMessage.success('已添加')
  }
  showDialog.value = false
  await fetchCustomers(keyword.value)
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除此会员？', '删除', { type: 'warning' })
    await deleteCustomer(id)
    ElMessage.success('已删除')
    await fetchCustomers(keyword.value)
  } catch {}
}

async function viewHistory(customer: Customer) {
  historyCustomer.value = customer
  historyBookings.value = await getCustomerBookings(customer.id)
  showHistory.value = true
}

function formatCurrency(val: number) {
  return '¥' + val.toFixed(0)
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { booked: '已预约', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }
  return map[status] || status
}

onMounted(() => fetchCustomers())
</script>

<template>
  <div class="customers-page">
    <!-- 顶部操作栏 -->
    <div class="action-bar glass-panel">
      <el-input
        v-model="keyword"
        placeholder="搜索姓名或手机号"
        clearable
        style="width: 260px"
        @clear="fetchCustomers()"
        @keyup.enter="fetchCustomers(keyword)"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon> 添加会员
      </el-button>
    </div>

    <!-- 会员列表 -->
    <div class="customer-list">
      <el-table :data="customers" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="消费总额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">{{ formatCurrency(row.total_spent) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="visit_count" label="到店次数" width="100" align="center" />
        <el-table-column prop="notes" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="注册时间" width="120">
          <template #default="{ row }">{{ row.created_at?.split('T')[0] || row.created_at?.split(' ')[0] }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text @click="viewHistory(row)">消费记录</el-button>
            <el-button size="small" text @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" text @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && customers.length === 0" class="empty-state">
        <el-icon :size="48" class="empty-icon"><User /></el-icon>
        <h3>暂无会员</h3>
        <p>点击"添加会员"开始管理您的客户</p>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingCustomer?.id ? '编辑会员' : '添加会员'" width="440px">
      <el-form v-if="editingCustomer" :model="editingCustomer" label-position="top">
        <el-form-item label="姓名" required>
          <el-input v-model="editingCustomer.name" placeholder="会员姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="editingCustomer.phone" placeholder="11位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editingCustomer.notes" type="textarea" :rows="2" placeholder="口味偏好、特殊要求等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 消费记录弹窗 -->
    <el-dialog v-model="showHistory" :title="`${historyCustomer?.name} — 消费记录`" width="640px">
      <div v-if="historyBookings.length === 0" class="empty-history">暂无消费记录</div>
      <el-table v-else :data="historyBookings" stripe size="small">
        <el-table-column prop="booking_date" label="日期" width="110" />
        <el-table-column label="时间" width="120">
          <template #default="{ row }">{{ row.start_time }} - {{ row.end_time }}</template>
        </el-table-column>
        <el-table-column prop="room_name" label="包间" width="80" />
        <el-table-column prop="package_name" label="套餐" min-width="130" />
        <el-table-column label="金额" width="90" align="right">
          <template #default="{ row }">{{ formatCurrency(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'completed' ? '' : row.status === 'cancelled' ? 'danger' : 'info'">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.customers-page {
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

.customer-list {
  background: rgba(255,255,255,0.85);
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.6);
  padding: 4px;
  overflow: hidden;
}

.amount {
  font-weight: 600;
  color: $text;
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
