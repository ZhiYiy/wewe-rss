import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {} 