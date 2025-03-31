import { Module } from '@nestjs/common';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import { PrismaModule } from '@server/prisma/prisma.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { DatabaseModule } from '@server/database/database.module';

@Module({
  imports: [PrismaModule, TrpcModule, DatabaseModule],
  controllers: [FeedsController],
  providers: [FeedsService],
})
export class FeedsModule {}
