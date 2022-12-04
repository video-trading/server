import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UpdateTranscodingDto } from './dto/update-transcoding.dto';
import { TranscodingService } from './transcoding.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';

@Controller('transcoding')
@ApiTags('transcoding')
export class TranscodingController {
  constructor(private readonly transcodingService: TranscodingService) {}

  @Get(':id')
  findAll(@Param('id') videoId: string) {
    return this.transcodingService.findAll(videoId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    description: 'Update transcoding status by video id and video quality',
  })
  update(@Param('id') id: string, @Body() result: UpdateTranscodingDto) {
    if (id === undefined) {
      throw new HttpException('Video id is required', 400);
    }
    return this.transcodingService.update(id, result);
  }
}
