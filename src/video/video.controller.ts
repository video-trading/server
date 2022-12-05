import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Prisma, Video } from '@prisma/client';
import { Pagination, PaginationSchema } from '../common/pagination';
import { TranscodingService } from '../transcoding/transcoding.service';
import { StorageService } from '../storage/storage.service';

import { VideoService } from './video.service';
import { InjectAMQPChannel } from '@enriqcg/nestjs-amqp';
import { Channel } from 'amqplib';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { config } from '../common/utils/config/config';
import { GetVideoDto } from './dto/get-video.dto';

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
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    description: 'Create a new video',
  })
  async create(
    @Body() video: CreateVideoDto,
    @Request() req,
  ): Promise<{ video: Video; preSignedURL: string }> {
    const createdVideo = await this.videoService.create(video, req.user.userId);
    const preSignedURL =
      await this.storageService.generatePreSignedUrlForVideoUpload(
        createdVideo,
      );
    return {
      video: createdVideo,
      preSignedURL,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/analyzing')
  async startAnalyzing(@Param('id') id: string) {
    const video = await this.videoService.findOne(id);
    const exist = await this.storageService.checkIfVideoExists(video);
    if (!exist) {
      throw new HttpException("Video doesn't exist", 400);
    }
    const success = this.amqpChannel.publish(
      'video',
      'analyzing',
      Buffer.from(JSON.stringify(video)),
    );

    return { success };
  }

  @Get()
  @ApiExtraModels(GetVideoDto)
  @ApiOkResponse({
    description: 'Get a list of videos',
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                $ref: getSchemaPath(GetVideoDto),
              },
            },
          },
        },
        {
          ...PaginationSchema,
        },
      ],
    },
  })
  async findAll(
    @Param('page') page: number = config.defaultStartingPage,
    @Param('per') limit: number = config.numberOfItemsPerPage,
  ): Promise<Pagination<Video>> {
    const videos = await this.videoService.findAll(page, limit);
    return videos;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.VideoUpdateInput) {
    return this.videoService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.videoService.remove(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/analyzing/result')
  @ApiCreatedResponse({
    description:
      'Submit analyzing result and then create a list of transcoding video using the transcoding result',
  })
  async submitAnalyingResult(
    @Param('id') id: string,
    @Body() result: CreateAnalyzingResult,
  ) {
    const analyzingResult = await this.videoService.submitAnalyzingResult(
      id,
      result,
    );
    const transodings =
      await this.transcodingService.createTranscodingsWithVideo(
        analyzingResult,
      );
    this.amqpChannel.publish(
      'video',
      'transcoding',
      Buffer.from(JSON.stringify(transodings)),
    );
    return transodings;
  }
}
