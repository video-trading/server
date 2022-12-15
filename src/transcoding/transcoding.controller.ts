import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UpdateTranscodingDto } from './dto/update-transcoding.dto';
import { TranscodingService } from './transcoding.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { InjectAMQPChannel } from '@enriqcg/nestjs-amqp';
import { Channel } from 'amqplib';
import { RequestWithUser } from '../common/types';
import { RetryTranscodingDto } from './dto/retry-transcoding.dto';
import { MessageQueue } from '../common/messageQueue';

@Controller('transcoding')
@ApiTags('transcoding')
export class TranscodingController {
  constructor(
    private readonly transcodingService: TranscodingService,
    @InjectAMQPChannel()
    private readonly amqpChannel: Channel,
  ) {}

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

  @Post('retry')
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    description: 'Retry transcoding which are not completed',
  })
  async retry(
    @Body() result: RetryTranscodingDto,
    @Request() req: RequestWithUser,
  ) {
    const transcodings =
      await this.transcodingService.findNotCompletedTranscodings(
        result.videoId,
        req.user.userId,
      );

    for (const transcoding of transcodings) {
      this.amqpChannel.publish(
        MessageQueue.transcodingExchange,
        `${MessageQueue.transcodingRoutingKey}.${result.videoId}`,
        Buffer.from(JSON.stringify(transcoding)),
      );
    }

    return transcodings;
  }
}
