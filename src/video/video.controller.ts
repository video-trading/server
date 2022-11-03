import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Prisma, Video, Transcoding } from '@prisma/client';
import { Pagination } from 'src/common/types';
import { TranscodingService } from '../transcoding/transcoding.service';
import { StorageService } from '../storage/storage.service';
import { config } from '../utils/config/config';
import { VideoService } from './video.service';
import { InjectAMQPChannel } from '@enriqcg/nestjs-amqp';
import { Channel } from 'amqplib';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateVideoDto } from './dto/create-video.dto';

@Controller('video')
@ApiTags('video')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly storageService: StorageService,
    private readonly transcodingService: TranscodingService,
    @InjectAMQPChannel()
    private readonly amqpChannel: Channel,
  ) {}

  @Post()
  async create(
    @Body() video: CreateVideoDto,
  ): Promise<{ video: Video; preSignedURL: string }> {
    const createdVideo = await this.videoService.create(video);
    const preSignedURL =
      await this.storageService.generatePreSignedUrlForUpload(createdVideo);
    return {
      video: createdVideo,
      preSignedURL,
    };
  }

  @Post(':id/analyzing')
  async startAnalyzing(@Param('id') id: string) {
    const video = await this.videoService.findOne(id);
    const success = this.amqpChannel.publish(
      'video',
      'analyzing',
      Buffer.from(JSON.stringify(video)),
    );

    return { success };
  }

  @Get()
  async findAll(
    @Param('page') page: number = config.defaultStartingPage,
    @Param('limit') limit: number = config.numberOfItemsPerPage,
  ): Promise<Pagination<Video>> {
    const videos = await this.videoService.findAll(page, limit);
    const count = await this.videoService.count();
    return {
      page,
      limit,
      total: count,
      data: videos,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.VideoUpdateInput) {
    return this.videoService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.videoService.remove(id);
  }

  @Post(':id/analyzing/result')
  @ApiCreatedResponse({
    description:
      'Submit analyzing result and then create a list of transcoding video using the transcoding result',
  })
  async submitAnalyingResult(
    @Param('id') id: string,
    @Body() result: Prisma.AnalyzingResultCreateInput,
  ) {
    const analyzingResult = await this.videoService.submitAnalyzingResult(
      id,
      result,
    );
    const transodings =
      await this.transcodingService.createTranscodingsWithVideo(
        analyzingResult,
      );

    return transodings;
  }
}
