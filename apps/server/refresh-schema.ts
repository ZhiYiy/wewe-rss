import { createClient } from '@supabase/supabase-js';

// 手动获取环境变量，不使用dotenv库
// 假设.env文件已被读取（NestJS应用通常已配置）
async function refreshSchemaCache() {
  console.log('开始刷新 Supabase 模式缓存...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // 强制刷新模式
    console.log('获取数据库表列表以刷新缓存...');
    
    // 尝试访问 wx_feeds 表
    const { data: feeds, error: feedsError } = await supabase
      .from('wx_feeds')
      .select('id, mp_name, mp_cover')
      .limit(1);
      
    if (feedsError) {
      console.error('访问 wx_feeds 表失败:', feedsError.message);
      throw feedsError;
    }
    
    console.log('成功访问 wx_feeds 表:', feeds);
    
    // 尝试访问 wx_articles 表
    const { data: articles, error: articlesError } = await supabase
      .from('wx_articles')
      .select('id, mp_id')
      .limit(1);
      
    if (articlesError) {
      console.error('访问 wx_articles 表失败:', articlesError.message);
      throw articlesError;
    }
    
    console.log('成功访问 wx_articles 表:', articles);
    
    // 尝试访问 wx_accounts 表
    const { data: accounts, error: accountsError } = await supabase
      .from('wx_accounts')
      .select('id, name')
      .limit(1);
      
    if (accountsError) {
      console.error('访问 wx_accounts 表失败:', accountsError.message);
      throw accountsError;
    }
    
    console.log('成功访问 wx_accounts 表:', accounts);
    
    console.log('模式缓存刷新成功！');
  } catch (error) {
    console.error('刷新模式缓存时出错:', error);
    process.exit(1);
  }
}

refreshSchemaCache(); 