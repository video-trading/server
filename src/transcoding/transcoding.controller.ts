import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UpdateTranscodingDto } from './dto/update-transcoding.dto';
import { TranscodingService } from './transcoding.service';

@Controller('transcoding')
@ApiTags('transcoding')
export class TranscodingController {
  constructor(private readonly transcodingService: TranscodingService) {}
  @Get(':id')
  findAll(@Param('videoId') videoId: string) {
    return this.transcodingService.findAll(videoId);
  }

  @Patch(':id')
  @ApiCreatedResponse({
    description: 'Update transcoding status by video id and video quality',
  })
  update(@Param('videoId') id: string, @Body() result: UpdateTranscodingDto) {
    return this.transcodingService.update(id, result);
  }
}
