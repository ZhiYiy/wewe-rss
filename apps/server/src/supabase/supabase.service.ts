import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase.types';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabaseClient: SupabaseClient<Database, "public", any>;
  private tablePrefix: string;
  
  constructor(private configService: ConfigService) {
    // 获取环境变量中的 Supabase 配置
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    
    // 获取表名前缀
    this.tablePrefix = this.configService.get<string>('TABLE_PREFIX', 'wx_');
    
    // 确保 supabaseUrl 不为 undefined，提供默认值或抛出错误
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    
    // 创建 Supabase 客户端，优先使用服务角色密钥（如果有）
    this.supabaseClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey || supabaseKey || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  async onModuleInit() {
    // 连接初始化时的逻辑，例如验证连接
    try {
      // 简单测试查询以验证连接
      const { data, error } = await this.supabaseClient
        .from('wx_accounts')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error('Supabase 连接测试失败:', error.message);
      } else {
        console.log('Supabase 连接成功!');
      }
    } catch (error) {
      console.error('Supabase 连接错误:', error);
    }
  }

  // 获取 Supabase 客户端实例，更新返回类型
  getClient(): SupabaseClient<Database, "public", any> {
    return this.supabaseClient;
  }

  // 账号相关方法
  async getAccount(id: string) {
    return this.supabaseClient
      .from('wx_accounts')
      .select('*')
      .eq('id', id)
      .single();
  }

  async createAccount(account: Database['public']['Tables']['wx_accounts']['Insert']) {
    return this.supabaseClient
      .from('wx_accounts')
      .insert(account)
      .select()
      .single();
  }

  async updateAccount(id: string, data: Database['public']['Tables']['wx_accounts']['Update']) {
    return this.supabaseClient
      .from('wx_accounts')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  }

  // Feed 相关方法
  async getFeed(id: string) {
    return this.supabaseClient
      .from('wx_feeds')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getAllFeeds(status = 1) {
    return this.supabaseClient
      .from('wx_feeds')
      .select('*')
      .eq('status', status);
  }

  async createFeed(feed: Database['public']['Tables']['wx_feeds']['Insert']) {
    return this.supabaseClient
      .from('wx_feeds')
      .insert(feed)
      .select()
      .single();
  }

  async updateFeed(id: string, data: Database['public']['Tables']['wx_feeds']['Update']) {
    return this.supabaseClient
      .from('wx_feeds')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  }

  // Article 相关方法
  async getArticle(id: string) {
    return this.supabaseClient
      .from('wx_articles')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getArticlesByFeedId(mpId: string, limit = 20) {
    return this.supabaseClient
      .from('wx_articles')
      .select('*')
      .eq('mp_id', mpId)
      .order('publish_time', { ascending: false })
      .limit(limit);
  }

  async createArticle(article: Database['public']['Tables']['wx_articles']['Insert']) {
    return this.supabaseClient
      .from('wx_articles')
      .insert(article)
      .select()
      .single();
  }

  async createArticles(articles: Database['public']['Tables']['wx_articles']['Insert'][]) {
    return this.supabaseClient
      .from('wx_articles')
      .insert(articles)
      .select();
  }
}