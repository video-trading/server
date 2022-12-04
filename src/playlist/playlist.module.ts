import { Module } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { PlaylistController } from './playlist.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PlaylistService, PrismaService],
  controllers: [PlaylistController],
})
export class PlaylistModule {}
