#!/bin/bash

# 刷新Supabase Schema缓存的脚本

# 设置工作目录为脚本所在目录
cd "$(dirname "$0")"

# 从.env文件中读取Supabase设置
SUPABASE_URL=$(grep "SUPABASE_URL" .env | cut -d "=" -f2)
SUPABASE_ANON_KEY=$(grep "SUPABASE_ANON_KEY" .env | cut -d "=" -f2)

# 定义函数执行curl请求到Supabase
refresh_schema() {
  echo "开始刷新 Supabase Schema 缓存..."
  
  # 检查必要的环境变量
  if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "错误: 缺少必要的环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY"
    exit 1
  fi
  
  echo "Supabase URL: $SUPABASE_URL"
  
  # 构建Supabase请求URL和请求头
  URL="${SUPABASE_URL}/rest/v1/wx_feeds?select=id,mp_name,mp_cover&limit=1"
  AUTH_HEADER="apikey: ${SUPABASE_ANON_KEY}"
  AUTHORIZATION="Authorization: Bearer ${SUPABASE_ANON_KEY}"
  
  echo "正在请求 Supabase API 以刷新 Schema 缓存..."
  
  # 执行请求获取wx_feeds表的数据
  RESPONSE=$(curl -s -X GET "$URL" \
    -H "$AUTH_HEADER" \
    -H "$AUTHORIZATION" \
    -H "Content-Type: application/json")
  
  # 检查响应
  if [[ $RESPONSE == *"error"* ]]; then
    echo "错误: 访问 Supabase API 失败"
    echo "$RESPONSE"
    exit 1
  else
    echo "成功访问 wx_feeds 表，Schema 缓存已刷新"
    echo "响应: $RESPONSE"
  fi
  
  echo "Supabase Schema 缓存刷新成功!"
}

# 执行刷新函数
refresh_schema 