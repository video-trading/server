import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TranscodingStatus } from '../common/video';
import { TranscodingService } from './transcoding.service';

@Controller('transcoding')
@ApiTags('transcoding')
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
