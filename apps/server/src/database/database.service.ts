import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * 数据库服务适配器
 * 提供统一的数据访问接口，可以切换底层实现（Prisma或Supabase）
 */
@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly useSupabase: boolean; // 是否使用Supabase API而不是Prisma
  private readonly isSqlite: boolean; // 是否使用SQLite数据库

  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    // 通过配置决定是否使用Supabase API
    this.useSupabase = this.configService.get<boolean>('USE_SUPABASE_API', false);
    // 检查数据库类型是否为SQLite
    this.isSqlite = this.configService.get<string>('DATABASE_TYPE', '') === 'sqlite';
    
    this.logger.log(`数据库服务初始化 - 使用 ${this.useSupabase ? 'Supabase API' : 'Prisma ORM'} 和 ${this.isSqlite ? 'SQLite' : 'PostgreSQL'}`);
  }

  async onModuleInit() {
    this.logger.log('数据库服务已初始化');
  }

  /**
   * 将驼峰命名字段转换为下划线命名
   * @param data 驼峰命名的数据对象
   * @param fieldMappings 字段映射关系 {驼峰字段名: 下划线字段名}
   * @returns 转换后的数据对象
   * @note 当前未使用，保留以供将来使用
   */
  private convertCamelToSnake(data: any, fieldMappings: Record<string, string>) {
    if (!data) return {};
    const result: Record<string, any> = {};
    
    Object.keys(fieldMappings).forEach(camelKey => {
      if (data[camelKey] !== undefined) {
        result[fieldMappings[camelKey]] = data[camelKey];
      }
    });
    
    return result;
  }

  /**
   * Feed字段映射关系 - 驼峰转下划线
   */
  private feedFieldMappings: Record<string, string> = {
    id: 'id',
    mpName: 'mp_name',
    mpCover: 'mp_cover',
    mpIntro: 'mp_intro',
    status: 'status',
    syncTime: 'sync_time',
    updateTime: 'update_time',
    hasHistory: 'has_history',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  };

  /**
   * Article字段映射关系 - 驼峰转下划线
   */
  private articleFieldMappings: Record<string, string> = {
    id: 'id',
    mpId: 'mp_id',
    title: 'title',
    picUrl: 'pic_url',
    publishTime: 'publish_time',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  };

  // ===================== 账号相关方法 =====================

  /**
   * 获取指定ID的账号
   */
  async getAccount(id: string) {
    if (this.useSupabase) {
      const { data, error } = await this.supabaseService.getAccount(id);
      if (error) throw error;
      return data;
    } else {
      return this.prismaService.account.findUnique({
        where: { id },
      });
    }
  }

  /**
   * 创建账号
   */
  async createAccount(data: any) {
    if (this.useSupabase) {
      const { data: account, error } = await this.supabaseService.createAccount(data);
      if (error) throw error;
      return account;
    } else {
      return this.prismaService.account.create({
        data,
      });
    }
  }

  /**
   * 更新账号
   */
  async updateAccount(id: string, data: any) {
    if (this.useSupabase) {
      const { data: account, error } = await this.supabaseService.updateAccount(id, data);
      if (error) throw error;
      return account;
    } else {
      return this.prismaService.account.update({
        where: { id },
        data,
      });
    }
  }

  /**
   * 删除账号
   */
  async deleteAccount(id: string) {
    if (this.useSupabase) {
      const { error } = await this.supabaseService.getClient()
        .from('wx_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id };
    } else {
      return this.prismaService.account.delete({
        where: { id },
      });
    }
  }

  /**
   * 获取有效账号
   */
  async getEnabledAccounts(excludeIds: string[] = []) {
    if (this.useSupabase) {
      // 使用Supabase API获取有效账号
      const query = this.supabaseService.getClient()
        .from('wx_accounts')
        .select('*')
        .eq('status', 1);
        
      if (excludeIds.length > 0) {
        query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data || [];
    } else {
      // 使用Prisma ORM获取有效账号
      return this.prismaService.account.findMany({
        where: {
          status: 1,
          NOT: excludeIds.length > 0 ? {
            id: { in: excludeIds },
          } : undefined,
        },
        take: 10,
      });
    }
  }

  // ===================== Feed相关方法 =====================

  /**
   * 获取指定ID的Feed
   */
  async getFeed(id: string) {
    if (this.useSupabase) {
      const { data, error } = await this.supabaseService.getFeed(id);
      if (error) throw error;
      return data;
    } else {
      return this.prismaService.feed.findUnique({
        where: { id },
      });
    }
  }

  /**
   * 获取所有启用的Feed
   */
  async getAllFeeds(status = 1) {
    if (this.useSupabase) {
      const { data, error } = await this.supabaseService.getAllFeeds(status);
      if (error) throw error;
      return data || [];
    } else {
      return this.prismaService.feed.findMany({
        where: { status },
      });
    }
  }

  /**
   * 创建Feed
   */
  async createFeed(data: any) {
    if (this.useSupabase) {
      // 将驼峰命名转换为下划线命名，并确保必要字段存在
      const convertedData = {
        id: data.id,
        mp_name: data.mpName,
        mp_cover: data.mpCover,
        mp_intro: data.mpIntro,
        update_time: data.updateTime,
        status: data.status ?? 1,
        sync_time: data.syncTime ?? 0,
        has_history: data.hasHistory ?? 1,
      };
      
      // 先尝试获取该ID的Feed
      const { data: existingFeed, error: getFeedError } = await this.supabaseService.getFeed(data.id);
      
      // 如果获取出错但不是因为"未找到"，则抛出错误
      if (getFeedError && getFeedError.code !== 'PGRST116') {
        throw getFeedError;
      }
      
      // 如果Feed已存在，执行更新操作
      if (existingFeed) {
        this.logger.log(`Feed ${data.id} 已存在，执行更新操作`);
        const { data: updatedFeed, error: updateError } = await this.supabaseService.updateFeed(data.id, convertedData);
        if (updateError) throw updateError;
        return updatedFeed;
      } 
      
      // Feed不存在，执行创建操作
      try {
        const { data: feed, error } = await this.supabaseService.createFeed(convertedData);
        if (error) throw error;
        return feed;
      } catch (error: any) {
        // 捕获可能的唯一约束冲突错误(并发情况下可能发生)
        if (error.code === '23505' || error.message?.includes('duplicate key value')) {
          this.logger.warn(`检测到Feed ${data.id}的并发插入，尝试更新操作`);
          const { data: updatedFeed, error: updateError } = await this.supabaseService.updateFeed(data.id, convertedData);
          if (updateError) throw updateError;
          return updatedFeed;
        }
        throw error;
      }
    } else {
      // Prisma ORM处理
      try {
        return await this.prismaService.feed.create({
          data,
        });
      } catch (error: any) {
        // 捕获Prisma的唯一约束错误
        if (error.code === 'P2002') {
          this.logger.warn(`Feed ${data.id} 已存在，执行更新操作`);
          return this.prismaService.feed.update({
            where: { id: data.id },
            data,
          });
        }
        throw error;
      }
    }
  }

  /**
   * 更新Feed
   */
  async updateFeed(id: string, data: any) {
    if (this.useSupabase) {
      // 将驼峰命名转换为下划线命名
      const convertedData = this.convertCamelToSnake(data, this.feedFieldMappings);
      
      // Supabase的updateFeed接受任意键值对作为更新数据
      const { data: feed, error } = await this.supabaseService.updateFeed(id, convertedData as any);
      if (error) throw error;
      return feed;
    } else {
      return this.prismaService.feed.update({
        where: { id },
        data,
      });
    }
  }

  /**
   * 删除Feed
   */
  async deleteFeed(id: string) {
    if (this.useSupabase) {
      const { error } = await this.supabaseService.getClient()
        .from('wx_feeds')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id };
    } else {
      return this.prismaService.feed.delete({
        where: { id },
      });
    }
  }

  // ===================== 文章相关方法 =====================

  /**
   * 获取指定ID的文章
   */
  async getArticle(id: string) {
    if (this.useSupabase) {
      const { data, error } = await this.supabaseService.getArticle(id);
      if (error) throw error;
      return data;
    } else {
      return this.prismaService.article.findUnique({
        where: { id },
      });
    }
  }

  /**
   * 获取指定Feed的文章列表
   */
  async getArticlesByFeedId(mpId: string, limit = 20) {
    if (this.useSupabase) {
      // 注意：在Supabase中使用mp_id字段名
      const { data, error } = await this.supabaseService.getArticlesByFeedId(mpId, limit);
      if (error) throw error;
      return data || [];
    } else {
      return this.prismaService.article.findMany({
        where: { mpId },
        orderBy: {
          publishTime: 'desc',
        },
        take: limit,
      });
    }
  }

  /**
   * 创建文章
   */
  async createArticle(data: any) {
    if (this.useSupabase) {
      // 将驼峰命名转换为下划线命名，并确保必要字段存在
      const convertedData = {
        id: data.id,
        mp_id: data.mpId,
        title: data.title,
        pic_url: data.picUrl || '',
        publish_time: data.publishTime,
      };
      
      const { data: article, error } = await this.supabaseService.createArticle(convertedData);
      if (error) throw error;
      return article;
    } else {
      return this.prismaService.article.create({
        data,
      });
    }
  }

  /**
   * 批量创建文章
   */
  async createArticles(dataList: any[]) {
    if (this.useSupabase) {
      // 批量转换字段名
      const convertedDataList = dataList.map(data => ({
        id: data.id,
        mp_id: data.mpId,
        title: data.title,
        pic_url: data.picUrl || '',
        publish_time: data.publishTime,
      }));
      
      const { data, error } = await this.supabaseService.createArticles(convertedDataList);
      if (error) throw error;
      return data;
    } else if (this.isSqlite) {
      // SQLite不支持createMany，使用事务进行批量插入
      const inserts = dataList.map(item => 
        this.prismaService.article.create({
          data: item,
        })
      );
      return this.prismaService.$transaction(inserts);
    } else {
      // PostgreSQL支持createMany
      // @ts-ignore - 忽略TS错误，因为SQLite不支持但PostgreSQL支持
      return this.prismaService.article.createMany({
        data: dataList,
        skipDuplicates: true,
      });
    }
  }

  /**
   * 更新或创建文章
   */
  async upsertArticle(id: string, createData: any, updateData: any) {
    if (this.useSupabase) {
      // 尝试先获取文章
      const { data, error } = await this.supabaseService.getArticle(id);
      
      if (error && error.code !== 'PGRST116') { // 不是"未找到"的错误
        throw error;
      }
      
      if (data) {
        // 文章存在，更新 - 转换字段名
        const convertedUpdateData = {
          title: updateData.title,
          pic_url: updateData.picUrl || '',
          publish_time: updateData.publishTime,
        };
        
        const { data: updatedArticle, error: updateError } = await this.supabaseService
          .getClient()
          .from('wx_articles')
          .update(convertedUpdateData)
          .eq('id', id)
          .select()
          .single();
          
        if (updateError) throw updateError;
        return updatedArticle;
      } else {
        // 文章不存在，创建 - 转换字段名
        const convertedCreateData = {
          id: createData.id,
          mp_id: createData.mpId,
          title: createData.title,
          pic_url: createData.picUrl || '',
          publish_time: createData.publishTime,
        };
        
        const { data: newArticle, error: createError } = await this.supabaseService.createArticle(convertedCreateData);
        if (createError) throw createError;
        return newArticle;
      }
    } else {
      // 使用Prisma的upsert
      return this.prismaService.article.upsert({
        where: { id },
        create: createData,
        update: updateData,
      });
    }
  }

  /**
   * 获取文章列表，支持分页和按照mpId筛选
   */
  async getArticles({ limit = 20, cursor, mpId }: { limit?: number; cursor?: string; mpId?: string }) {
    if (this.useSupabase) {
      // 使用Supabase API查询
      let query = this.supabaseService.getClient()
        .from('wx_articles')
        .select('*')
        .order('publish_time', { ascending: false })
        .limit(limit);
      
      // 如果有mpId，添加筛选条件 - 使用mp_id字段名
      if (mpId) {
        query = query.eq('mp_id', mpId);
      }
      
      // 如果有cursor，添加分页条件
      if (cursor) {
        // 获取cursor对应的文章
        const { data: cursorArticle, error: cursorError } = await this.supabaseService.getArticle(cursor);
        if (cursorError) throw cursorError;
        
        if (cursorArticle) {
          // 使用cursor对应文章的publishTime作为分页条件
          query = query.lt('publish_time', cursorArticle.publishTime);
          // 或者使用从cursor开始筛选
          // query = query.gt('id', cursor);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      // 使用Prisma ORM查询
      return this.prismaService.article.findMany({
        orderBy: [
          {
            publishTime: 'desc',
          },
        ],
        take: limit,
        where: mpId ? { mpId } : undefined,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
      });
    }
  }

  /**
   * 删除文章
   */
  async deleteArticle(id: string) {
    if (this.useSupabase) {
      const { error } = await this.supabaseService
        .getClient()
        .from('wx_articles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return { id };
    } else {
      return this.prismaService.article.delete({
        where: { id },
      });
    }
  }
} 