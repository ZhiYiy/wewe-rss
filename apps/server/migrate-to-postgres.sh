#!/bin/bash

# 确保在正确的目录运行
cd "$(dirname "$0")"

echo "====== 开始迁移到 PostgreSQL 数据库 ======"

# 1. 生成新的Prisma迁移文件
echo "正在生成Prisma迁移..."
npx prisma migrate dev --name migrate_to_postgresql

# 2. 应用迁移到数据库
echo "正在应用迁移到数据库..."
npx prisma migrate deploy

# 3. 生成Prisma客户端
echo "正在生成Prisma客户端..."
npx prisma generate

echo "====== 迁移完成 ======"
echo "数据库结构已迁移到PostgreSQL。如需迁移数据，请手动执行数据迁移。"

# 4. 显示数据库结构
echo "====== 当前数据库结构 ======"
npx prisma db pull

echo "====== 完成 ======" 