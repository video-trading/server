import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TranscodingService } from './transcoding.service';

export enum TranscodingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Controller('transcoding')
export class TranscodingController {
  constructor(private readonly transcodingService: TranscodingService) {}

  @Get()
  findAll(@Param('videoId') videoId: string) {
    return this.transcodingService.findAll(videoId);
  }

  @Patch(':id')
  update(@Param('videoId') id: string, @Body() result: TranscodingStatus) {
    return this.transcodingService.update(id, result);
  }
}
