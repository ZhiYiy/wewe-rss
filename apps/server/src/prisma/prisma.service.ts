import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly useSupabase: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.useSupabase = this.configService.get('USE_SUPABASE_API', 'false') === 'true';
  }

  async onModuleInit() {
    if (!this.useSupabase) {
      this.logger.log('使用Prisma ORM连接数据库');
      await this.$connect();
    } else {
      this.logger.log('使用Supabase API模式，跳过Prisma数据库连接');
    }
  }
}
