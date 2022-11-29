import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { TranscodingStatus } from '../common/video';
import { UpdateTranscodingDto } from './dto/update-transcoding.dto';
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
  @ApiBody({
    description: 'Update transcoding status by video id and video quality',
  })
  update(@Param('videoId') id: string, @Body() result: UpdateTranscodingDto) {
    return this.transcodingService.update(id, result);
  }
}
