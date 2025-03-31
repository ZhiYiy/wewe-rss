#!/bin/bash

# 确保在正确的目录运行
cd "$(dirname "$0")"

echo "运行 Supabase 连接测试..."
npx ts-node supabase-direct-test.ts

# 获取脚本退出码
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
  echo "测试通过!"
else
  echo "测试失败!"
fi

exit $TEST_RESULT 