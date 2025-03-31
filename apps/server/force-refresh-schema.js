const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 直接读取.env文件内容并提取必要的变量
const envFilePath = path.resolve('.env');
const envContent = fs.readFileSync(envFilePath, 'utf8');

// 更简单的方式解析环境变量
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  
  if (line.startsWith('SUPABASE_URL=')) {
    supabaseUrl = line.substring('SUPABASE_URL='.length);
  } else if (line.startsWith('SUPABASE_ANON_KEY=')) {
    supabaseKey = line.substring('SUPABASE_ANON_KEY='.length);
  }
});

if (!supabaseUrl || !supabaseKey) {
  console.error('找不到必要的环境变量: SUPABASE_URL 或 SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('开始强制刷新Supabase Schema缓存...');
console.log('Supabase URL:', supabaseUrl);

// 手动请求Supabase API查询表的schema
const tables = ['wx_feeds', 'wx_articles', 'wx_accounts'];

// 对每个表执行请求来刷新schema缓存
for (const table of tables) {
  console.log(`刷新 ${table} 表的缓存...`);
  try {
    const command = `curl -s "${supabaseUrl}/rest/v1/${table}?limit=0" -H "apikey: ${supabaseKey}" -H "Authorization: Bearer ${supabaseKey}"`;
    const result = execSync(command).toString();
    console.log(`成功查询 ${table} 表`);
  } catch (error) {
    console.error(`查询 ${table} 表失败:`, error.message);
  }
}

// 检查wx_feeds表的列信息
console.log('检查wx_feeds表的列信息...');
try {
  const command = `curl -s "${supabaseUrl}/rest/v1/${tables[0]}?select=mp_cover&limit=1" -H "apikey: ${supabaseKey}" -H "Authorization: Bearer ${supabaseKey}"`;
  const result = execSync(command).toString();
  console.log('wx_feeds表结构检查结果:', result);
} catch (error) {
  console.error('查询wx_feeds表结构失败:', error.message);
}

console.log('Schema缓存刷新操作完成!'); 