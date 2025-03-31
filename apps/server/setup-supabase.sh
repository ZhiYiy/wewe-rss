#!/bin/bash

# 确保在正确的目录运行
cd "$(dirname "$0")"

echo "====== Supabase 配置助手 ======"
echo "此脚本帮助配置Supabase数据库和权限"

# 1. 读取 .env 文件中的 Supabase 配置
if [ ! -f .env ]; then
    echo "未找到 .env 文件！"
    exit 1
fi

# 从.env加载Supabase配置
SUPABASE_URL=$(grep SUPABASE_URL .env | cut -d '=' -f2)
SUPABASE_KEY=$(grep SUPABASE_ANON_KEY .env | cut -d '=' -f2)
TABLE_PREFIX=$(grep TABLE_PREFIX .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "wx_")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "SUPABASE_URL 或 SUPABASE_ANON_KEY 未在 .env 中设置！"
    exit 1
fi

echo "使用以下Supabase配置："
echo "URL: $SUPABASE_URL"
echo "表前缀: $TABLE_PREFIX"

# 2. 创建tables
echo "=== 需要在Supabase中创建的表（复制以下SQL到Supabase控制台的SQL编辑器中执行）==="
echo ""
cat << EOF
-- 账号表
CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}accounts (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  name TEXT NOT NULL,
  status INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 订阅源表
CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}feeds (
  id TEXT PRIMARY KEY,
  mp_name TEXT NOT NULL,
  mp_cover TEXT NOT NULL,
  mp_intro TEXT NOT NULL,
  status INTEGER DEFAULT 1,
  sync_time INTEGER DEFAULT 0,
  update_time INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  has_history INTEGER DEFAULT 1
);

-- 文章表
CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}articles (
  id TEXT PRIMARY KEY,
  mp_id TEXT NOT NULL,
  title TEXT NOT NULL,
  pic_url TEXT NOT NULL,
  publish_time INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为每个表添加行级安全性策略
ALTER TABLE ${TABLE_PREFIX}accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${TABLE_PREFIX}feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${TABLE_PREFIX}articles ENABLE ROW LEVEL SECURITY;

-- 创建允许匿名用户读取的策略
CREATE POLICY "Allow anonymous read access" ON ${TABLE_PREFIX}accounts FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON ${TABLE_PREFIX}feeds FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON ${TABLE_PREFIX}articles FOR SELECT USING (true);

-- 创建允许服务角色完全访问的策略
CREATE POLICY "Allow service role full access" ON ${TABLE_PREFIX}accounts USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON ${TABLE_PREFIX}feeds USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON ${TABLE_PREFIX}articles USING (auth.role() = 'service_role');
EOF

echo
echo "请在Supabase控制台的SQL编辑器中执行上述SQL语句以创建必要的表和权限"
echo "SQL编辑器路径: ${SUPABASE_URL}/project/sql"
echo

# 3. 测试连接
echo "测试Supabase连接..."
echo "如果你还没有执行上面的SQL创建表，测试可能会失败"

# 运行测试并捕获退出状态
npx ts-node supabase-direct-test.ts
TEST_RESULT=$?

# 根据测试结果提供反馈
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Supabase 连接测试成功！"
else
    echo "❌ Supabase 连接测试失败。"
    echo "可能的原因:"
    echo "  1. 表尚未在Supabase中创建"
    echo "  2. 连接信息不正确"
    echo "  3. Supabase项目尚未启动"
    echo ""
    echo "请先在Supabase控制台中执行上述SQL创建表，然后再运行测试"
fi

echo "====== 完成 ======" 