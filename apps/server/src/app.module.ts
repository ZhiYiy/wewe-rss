import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from '@server/trpc/trpc.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, { ConfigurationType } from './configuration';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedsModule } from './feeds/feeds.module';
import { SupabaseModule } from './supabase/supabase.module'; // 新增
import { DatabaseModule } from './database/database.module'; // 导入数据库模块

@Module({
  imports: [
    TrpcModule,
    FeedsModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(config: ConfigService) {
        const throttler =
          config.get<ConfigurationType['throttler']>('throttler');
        return [
          {
            ttl: 60,
            limit: throttler?.maxRequestPerMinute || 60,
          },
        ];
      },
    }),
    SupabaseModule, // 导入 SupabaseModule
    DatabaseModule, // 导入 DatabaseModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}