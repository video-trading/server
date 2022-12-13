import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AnalyzingResult, Video } from '@prisma/client';
import { Pagination, PaginationSchema } from '../common/pagination';
import { TranscodingService } from '../transcoding/transcoding.service';
import { SignedUrl, StorageService } from '../storage/storage.service';

import { VideoService } from './video.service';
import { InjectAMQPChannel } from '@enriqcg/nestjs-amqp';
import { Channel } from 'amqplib';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { config } from '../common/utils/config/config';
import { GetVideoDto } from './dto/get-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { RequestWithUser } from '../common/types';
import { PublishVideoDto } from './dto/publish-video.dto';
import { CreateAnalyzingJobDto } from './dto/create-analyzing-job.dto';
import { MessageQueue } from '../common/messageQueue';

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
  ): Promise<{ video: Video; preSignedURL: SignedUrl }> {
    const createdVideo = await this.videoService.create(video, req.user.userId);
    const preSignedURL = await this.storageService.generatePreSignedUrlForVideo(
      createdVideo,
    );
    return {
      video: createdVideo,
      preSignedURL: preSignedURL,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      "Will publish the video and set the video's status to ANALYZING",
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the message was published successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Video not found or video status is not in uploaded status',
  })
  @ApiUnauthorizedResponse({
    description: "Unauthorized. You don't have access to this video",
  })
  async publish(
    @Param('id') id: string,
    @Body() data: PublishVideoDto,
    @Request() req: RequestWithUser,
  ) {
    const video = await this.videoService.findOne(id);
    await this.videoService.permissionCheck(video, req.user.userId);
    await this.videoService.publish(id, data);
    const analyzingJob: CreateAnalyzingJobDto = {
      videoId: video.id,
      video: await this.storageService.generatePreSignedUrlForVideo(video),
      thumbnail: await this.storageService.generatePreSignedUrlForThumbnail(
        video,
      ),
    };

    const success = this.amqpChannel.publish(
      MessageQueue.analyzingExchange,
      `${MessageQueue.analyzingRoutingKey}.${video.id}`,
      Buffer.from(JSON.stringify(analyzingJob)),
    );
    return { success: Boolean(success) };
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
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
    @Query('category') category: string | undefined,
  ): Promise<Pagination<Video>> {
    // parse page and per to number
    const pageInt = page ? parseInt(page) : config.defaultStartingPage;
    const limitInt = limit ? parseInt(limit) : config.numberOfItemsPerPage;

    // if page or per is not a number, throw an error
    if (isNaN(pageInt) || isNaN(limitInt)) {
      throw new BadRequestException('page and per must be a number');
    }
    // if page or per is less than 1, throw an error
    if (pageInt < 1 || limitInt < 1) {
      throw new BadRequestException('page and per must be greater than 0');
    }

    if (category?.length === 0) {
      category = undefined;
    }

    const videos = await this.videoService.findAll(pageInt, limitInt, category);
    return videos;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Update video info',
    type: UpdateVideoDto,
  })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateVideoDto,
    @Request() req: RequestWithUser,
  ) {
    const video = await this.videoService.findOne(id);
    await this.videoService.permissionCheck(video, req.user.userId);
    return this.videoService.update(id, req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/uploaded')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Change video status to uploaded',
  })
  async onUploaded(@Param('id') id: string, @Request() req: RequestWithUser) {
    const video = await this.videoService.findOne(id);
    await this.videoService.permissionCheck(video, req.user.userId);
    return this.videoService.onVideoUploaded(id);
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
    @Request() req: RequestWithUser,
  ) {
    const analyzingResult = await this.videoService.submitAnalyzingResult(
      id,
      result,
    );
    const transodings =
      await this.transcodingService.createTranscodingsWithVideo(
        analyzingResult,
      );

    console.log(transodings[2]);

    // transodings.forEach((transcoding) =>
    //   this.amqpChannel.publish(
    //     MessageQueue.transcodingExchange,
    //     `${MessageQueue.transcodingRoutingKey}.${transcoding.videoId}.${transcoding.targetQuality}`,
    //     Buffer.from(JSON.stringify(transcoding)),
    //   ),
    // );
    await this.videoService.startTranscoding(id);
    return transodings;
  }
}
