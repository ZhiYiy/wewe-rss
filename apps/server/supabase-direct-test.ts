import { createClient } from '@supabase/supabase-js';

// Supabase 配置信息直接硬编码
const SUPABASE_CONFIG = {
  // Supabase项目URL
  url: 'https://jkfpvypackjschdphijv.supabase.co',
  // 匿名密钥（公开可用）
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZnB2eXBhY2tqc2NoZHBoaWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODcxNzksImV4cCI6MjA1NTk2MzE3OX0.vbSUMRzAts-f0no9h6GJOfik_xA8a9RgTeTqZ92YfT4',
  // 表前缀
  tablePrefix: 'wx_'
};

/**
 * 测试Supabase数据库连接
 * 直接使用硬编码的配置信息，不依赖环境变量
 */
async function testSupabaseConnection() {
  console.log('=== Supabase 数据库连接测试 ===');
  console.log(`URL: ${SUPABASE_CONFIG.url}`);
  
  try {
    // 创建Supabase客户端
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    
    // 构建表名
    const accountsTable = `${SUPABASE_CONFIG.tablePrefix}accounts`;
    console.log(`尝试查询 ${accountsTable} 表...`);
    
    // 执行简单查询测试连接
    const { data, error } = await supabase
      .from(accountsTable)
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Supabase 连接测试失败:');
      console.error(`错误代码: ${error.code}`);
      console.error(`错误信息: ${error.message}`);
      console.error(`错误详情: ${error.details}`);
      return false;
    }
    
    // 连接成功
    console.log('Supabase 连接成功!');
    console.log('查询结果:', data);
    
    // 测试其他表
    const feedsTable = `${SUPABASE_CONFIG.tablePrefix}feeds`;
    console.log(`尝试查询 ${feedsTable} 表...`);
    
    const feedResult = await supabase
      .from(feedsTable)
      .select('id, mp_name')
      .limit(2);
      
    if (feedResult.error) {
      console.log(`${feedsTable} 表查询失败: ${feedResult.error.message}`);
    } else {
      console.log(`${feedsTable} 表查询成功:`);
      console.log(feedResult.data);
    }
    
    return true;
  } catch (error) {
    // 捕获并显示任何其他错误
    console.error('执行 Supabase 连接测试时发生错误:');
    console.error(error);
    return false;
  }
}

// 执行测试
console.log('开始测试 Supabase 数据库连接...');

testSupabaseConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log('✅ Supabase 数据库连接测试通过');
      process.exit(0);
    } else {
      console.log('❌ Supabase 数据库连接测试失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('执行测试时发生意外错误:', error);
    process.exit(1);
  }); 