// Supabase 数据库类型定义
export type Database = {
    public: {
      Tables: {
        // 账号表
        wx_accounts: {
          Row: {
            id: string
            token: string
            name: string
            status: number
            created_at: string
            updated_at: string | null
          }
          Insert: {
            id: string
            token: string
            name: string
            status?: number
            created_at?: string
            updated_at?: string | null
          }
          Update: {
            id?: string
            token?: string
            name?: string
            status?: number
            created_at?: string
            updated_at?: string | null
          }
        }
        // 订阅源表
        wx_feeds: {
          Row: {
            id: string
            mp_name: string
            mp_cover: string
            mp_intro: string
            status: number
            sync_time: number
            update_time: number
            created_at: string
            updated_at: string | null
            has_history: number | null
          }
          Insert: {
            id: string
            mp_name: string
            mp_cover: string
            mp_intro: string
            status?: number
            sync_time?: number
            update_time: number
            created_at?: string
            updated_at?: string | null
            has_history?: number | null
          }
          Update: {
            id?: string
            mp_name?: string
            mp_cover?: string
            mp_intro?: string
            status?: number
            sync_time?: number
            update_time?: number
            created_at?: string
            updated_at?: string | null
            has_history?: number | null
          }
        }
        // 文章表
        wx_articles: {
          Row: {
            id: string
            mp_id: string
            title: string
            pic_url: string
            publish_time: number
            created_at: string
            updated_at: string | null
          }
          Insert: {
            id: string
            mp_id: string
            title: string
            pic_url: string
            publish_time: number
            created_at?: string
            updated_at?: string | null
          }
          Update: {
            id?: string
            mp_id?: string
            title?: string
            pic_url?: string
            publish_time?: number
            created_at?: string
            updated_at?: string | null
          }
        }
      }
    }
  }