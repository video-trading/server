import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { PrismaService } from 'src/prisma.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [VideoController],
  providers: [VideoService, PrismaService, StorageService],
})
export class VideoModule {}
