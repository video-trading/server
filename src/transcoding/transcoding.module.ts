import { Module } from '@nestjs/common';
import { TranscodingService } from './transcoding.service';
import { TranscodingController } from './transcoding.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TranscodingController],
  providers: [PrismaService, TranscodingService],
})
export class TranscodingModule {}
