import { Module } from '@nestjs/common';
import { TranscodingService } from './transcoding.service';
import { TranscodingController } from './transcoding.controller';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [TranscodingController],
  providers: [PrismaService, TranscodingService, StorageService],
})
export class TranscodingModule {}
