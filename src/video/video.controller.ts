import {
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
import { Video } from '@prisma/client';
import {
  getPageAndLimit,
  Pagination,
  PaginationSchema,
} from '../common/pagination';
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
import { GetVideoDto } from './dto/get-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { RequestWithUser } from '../common/types';
import { PublishVideoDto } from './dto/publish-video.dto';
import { CreateAnalyzingJobDto } from './dto/create-analyzing-job.dto';
import { MessageQueue } from '../common/messageQueue';
import { GetMyVideoDetailDto } from './dto/get-my-video-detail.dto';

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
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

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
  @ApiBearerAuth()
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

    for (const transcoding of transodings) {
      this.amqpChannel.publish(
        MessageQueue.transcodingExchange,
        `${MessageQueue.transcodingRoutingKey}.${id}`,
        Buffer.from(JSON.stringify(transcoding)),
      );
    }
    await this.videoService.startTranscoding(id);
    return transodings;
  }

  @Get('by/:userId')
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
  async findUserVideos(
    @Param('userId') userId: string,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);
    return await this.videoService.findVideosByUser(userId, pageInt, limitInt);
  }

  @Get('my/videos')
  @ApiExtraModels(GetVideoDto)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get a list of videos belong to current user',
  })
  async findMyVideos(
    @Request() req: RequestWithUser,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

    return await this.videoService.findMyVideos(
      req.user.userId,
      pageInt,
      limitInt,
    );
  }

  @Get('my/videos/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Get a video detail by id',
    type: GetMyVideoDetailDto,
  })
  async findMyVideoById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return await this.videoService.findMyVideoDetailById(id, req.user.userId);
  }
}
