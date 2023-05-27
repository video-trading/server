import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Video } from '@prisma/client';
import {
  getPageAndLimit,
  Pagination,
  PaginationSchema,
} from '../common/pagination';
import { SignedUrl, StorageService } from '../storage/storage.service';
import { TranscodingService } from '../transcoding/transcoding.service';

import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth-guard';
import { MessageQueue } from '../common/messageQueue';
import { RequestWithOptionalUser, RequestWithUser } from '../common/types';
import { CreateAnalyzingJobDto } from './dto/create-analyzing-job.dto';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { CreateVideoDto, CreateVideoResponse } from './dto/create-video.dto';
import { GetMyVideoDetailDto } from './dto/get-my-video-detail.dto';
import { GetVideoDto } from './dto/get-video.dto';
import { PublishVideoDto } from './dto/publish-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideoService } from './video.service';
import { Environments } from '../common/environment';

@Controller('video')
@ApiTags('video')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly storageService: StorageService,
    private readonly transcodingService: TranscodingService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('user')
  @ApiOperation({
    summary: 'Create a new video',
    description:
      'Before uploading the video, you should first call this api to create a video record in the database. ' +
      'This will return a pre-signed url for uploading the video.',
  })
  @ApiCreatedResponse({
    description: 'Create a new video',
    type: CreateVideoResponse,
  })
  async create(
    @Body() video: CreateVideoDto,
    @Request() req: RequestWithUser,
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
  @ApiBearerAuth('user')
  @ApiParam({
    name: 'id',
    description: 'Video id',
  })
  @ApiOperation({
    summary: 'Publish a video',
    description:
      "Will publish the video and set the video's status to `ANALYZING`." +
      'This will also check if the video is uploaded to the storage bucket, ' +
      'and will throw an error if it is not uploaded.',
  })
  @ApiOkResponse({
    description:
      "Will publish the video and set the video's status to `ANALYZING`",
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
    description: 'Video not found or video status is not in `uploaded` status',
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

    if (!Environments.is_test) {
      const success = this.amqpConnection.publish(
        MessageQueue.analyzingExchange,
        `${MessageQueue.analyzingRoutingKey}.${video.id}`,
        Buffer.from(JSON.stringify(analyzingJob)),
      );
      return { success: Boolean(success) };
    }
    return { success: true };
  }

  @Get()
  @ApiExtraModels(GetVideoDto)
  @ApiOperation({
    summary: 'Get a list of videos',
    description:
      'Get a list of videos and will return a paginated result.' +
      'If category is specified, then only videos in that category will be returned.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number starting from 1',
  })
  @ApiQuery({
    name: 'per',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Category id of the video',
  })
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
    if (category?.length === 0 || category === 'undefined') {
      category = undefined;
    }

    const videos = await this.videoService.findAll(pageInt, limitInt, category);
    return videos;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get a video',
    description:
      'Get a video by id. If user is authenticated,' +
      'then the purchasable will be set based on the user',
  })
  @ApiBearerAuth('user')
  @ApiOkResponse({
    description:
      'Get a video. If user is authenticated, then set purchasable to true if the user has not purchased the video',
  })
  findOne(@Param('id') id: string, @Req() req: RequestWithOptionalUser) {
    return this.videoService.findOne(id, req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth('user')
  @ApiOperation({
    summary: 'Update video info',
    description: 'Update video info by video id',
  })
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
  @ApiBearerAuth('user')
  @ApiOperation({
    summary: 'Change video status to uploaded',
    description: 'Change video status to uploaded',
  })
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
  @ApiOperation({
    summary: 'Delete a video',
    description: 'Delete a video by video id',
  })
  @ApiBearerAuth('user')
  remove(@Param('id') id: string, @Request() req) {
    return this.videoService.remove(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/analyzing/result')
  @ApiBearerAuth('worker')
  @ApiOperation({
    summary: 'Submit analyzing result',
    description:
      'This endpoint is used by transcoding worker to submit analyzing result',
  })
  @ApiCreatedResponse({
    description:
      'Submit analyzing result and then create a list of transcoding video using the transcoding result',
  })
  async submitAnalyzingResult(
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
      if (!Environments.is_test) {
        this.amqpConnection.publish(
          MessageQueue.transcodingExchange,
          `${MessageQueue.transcodingRoutingKey}.${id}`,
          Buffer.from(JSON.stringify(transcoding)),
        );
      }
    }
    await this.videoService.startTranscoding(id);
    return transodings;
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Submit failed analyzing result',
    description:
      'When maximum retry is reached, the worker will submit failed analyzing result',
  })
  @Post(':id/analyzing/failed')
  @ApiBearerAuth('worker')
  @ApiCreatedResponse({
    description: 'Submit failed analyzing result',
  })
  async submitFailedAnalyzingResult(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.videoService.submitFailedAnalyzingResult(id);
  }

  @Get('by/:userId')
  @ApiExtraModels(GetVideoDto)
  @ApiOperation({
    summary: 'Get a list of videos by user id',
    description: 'Get a list of videos by user id with pagination',
  })
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

  @Get('my/uploads')
  @ApiExtraModels(GetVideoDto)
  @ApiOperation({
    summary: 'Get a list of videos uploaded by the current user',
    description:
      'Get a list of videos uploaded by the current user with pagination',
  })
  @ApiBearerAuth('user')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get a list of videos uploaded to current user',
  })
  async findMyUploads(
    @Request() req: RequestWithUser,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

    return await this.videoService.findMyUploads(
      req.user.userId,
      pageInt,
      limitInt,
    );
  }

  @Get('my/owned')
  @ApiExtraModels(GetVideoDto)
  @ApiOperation({
    summary: 'Get a list of videos owned by the current user',
    description:
      'Get a list of videos owned by the current user with pagination',
  })
  @ApiBearerAuth('user')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get a list of videos owned by the current user',
  })
  async findMyOwned(
    @Request() req: RequestWithUser,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

    return await this.videoService.findMyOwned(
      req.user.userId,
      pageInt,
      limitInt,
    );
  }

  @Get('my/videos/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get an user's video detail by id",
    description: "Get an user's video detail by id",
  })
  @ApiBearerAuth('user')
  @ApiOkResponse({
    description: "Get an user's video detail by id",
    type: GetMyVideoDetailDto,
  })
  async findMyVideoById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return await this.videoService.findMyVideoDetailById(id, req.user.userId);
  }

  @Get('search/:keyword')
  @ApiOperation({
    summary: 'Search videos by keyword',
  })
  @ApiOkResponse({
    description: 'Search videos by keyword',
  })
  async searchVideos(@Param('keyword') keyword: string) {
    return await this.videoService.searchVideos(keyword);
  }
}
