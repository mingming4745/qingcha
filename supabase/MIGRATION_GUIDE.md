# Supabase 迁移指南

## 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)，注册/登录
2. 点击 "New Project"，选择组织，填写项目名称和数据库密码
3. 等待项目创建完成（约 1-2 分钟）

## 2. 执行数据库迁移

1. 进入项目 Dashboard → SQL Editor
2. 新建查询，粘贴 `001_schema.sql` 的内容，点击 "Run"
3. 再新建查询，粘贴 `002_seed.sql` 的内容，点击 "Run"

## 3. 创建认证用户

1. 进入 Authentication → Users → "Add user"
2. 输入邮箱和密码（这就是你的登录凭证）

## 4. 配置环境变量

1. 进入 Project Settings → API
2. 复制 "Project URL" 和 "anon public" key
3. 编辑项目根目录的 `.env` 文件：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxx
```

## 5. 启动应用

```bash
npm run dev
```

用第 3 步创建的邮箱和密码登录。

## 6. 导入旧数据（如有）

如果之前有 SQLite 数据需要迁移，可以在 Supabase Table Editor 中使用 CSV 导入功能。
