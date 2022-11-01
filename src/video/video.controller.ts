import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Prisma, Video } from '@prisma/client';
import { Pagination } from 'src/common/types';
import { TranscodingService } from '../transcoding/transcoding.service';
import { StorageService } from '../storage/storage.service';
import { config } from '../utils/config/config';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly storageService: StorageService,
    private readonly transcodingService: TranscodingService,
  ) {}

  @Post()
  async create(
    @Body() video: Prisma.VideoCreateInput,
  ): Promise<{ video: Video; preSignedURL: string }> {
    const createdVideo = await this.videoService.create(video);
    const preSignedURL = await this.storageService.generatePreSignedUrl(
      createdVideo,
    );
    return {
      video: createdVideo,
      preSignedURL,
    };
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

  @Post(':id/analyzeResult')
  async updateAnalyzeResult(
    @Param('id') id: string,
    @Body() result: Prisma.AnalyzingResultCreateInput,
  ) {
    const analyzingResult = await this.videoService.submitAnalyzingResult(
      id,
      result,
    );
    await this.transcodingService.createTranscodingsWithVideo(analyzingResult);
  }
}
