# 清茶 QingCha

茶馆经营管理系统 — 桌面端应用

## 功能

- **经营总览** - 今日营收、预约数、包间使用状态实时展示
- **预约管理** - 创建/管理预约，支持日历视图
- **会员管理** - 客户信息与消费记录
- **库存管理** - 商品库存跟踪与预警
- **营业报表** - 营收趋势、包间使用率、热销商品等数据分析
- **基础设置** - 包间、套餐、商品配置

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **UI**: Element Plus
- **桌面端**: Tauri 2
- **后端**: Supabase (PostgreSQL + Auth)
- **样式**: SCSS

## 项目结构

```
src/
├── composables/     # 组合式函数 (Supabase、计时器、业务逻辑)
├── layouts/         # 布局组件
├── router/          # 路由配置
├── styles/          # 全局样式与变量
├── views/           # 页面组件
└── App.vue          # 根组件
supabase/
└── migrations/      # 数据库迁移脚本
src-tauri/           # Tauri 桌面端配置
```

## 开发

### 环境要求

- Node.js 18+
- Rust (Tauri 依赖)
- Supabase 项目

### 配置

复制 `.env.example` 为 `.env`，填入 Supabase 配置：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 安装与运行

```bash
# 安装依赖
npm install

# Web 开发模式
npm run dev

# Tauri 桌面端开发模式
npm run tauri:dev

# 构建桌面端应用
npm run tauri:build
```

### 数据库初始化

在 Supabase SQL Editor 中依次执行 `supabase/migrations/` 下的迁移脚本。

## 构建产物

```bash
npm run tauri:build
```

构建完成后在 `src-tauri/target/release/bundle/` 目录下生成各平台安装包。
