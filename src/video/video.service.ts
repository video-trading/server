import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AnalyzingResult, Prisma, VideoStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { config } from '../common/utils/config/config';
import { getPaginationMetaData } from '../common/pagination';
import { Operation, StorageService } from '../storage/storage.service';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  create(video: CreateVideoDto, user: string) {
    return this.prisma.video.create({
      data: {
        ...video,
        User: {
          connect: {
            id: user,
          },
        },
      },
    });
  }

  findAll(page: number, per: number = config.numberOfItemsPerPage) {
    const videos = this.prisma.video.findMany({
      skip: (page - 1) * per,
      take: per,
    });

    const total = this.prisma.video.count();

    return Promise.all([videos, total]).then(([videos, total]) => ({
      items: videos,
      metadata: getPaginationMetaData(page, per, total),
    }));
  }

  async findOne(id: string) {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
    });

    return {
      ...video,
      url:
        video.status === VideoStatus.READY
          ? await this.storage.generatePreSignedUrlForVideo(
              video,
              Operation.GET,
            )
          : undefined,
    };
  }

  update(id: string, data: Prisma.VideoUpdateInput) {
    return this.prisma.video.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string, userId: string) {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
    });

    if (video?.userId !== userId) {
      throw new UnauthorizedException();
    }

    return this.prisma.video.delete({
      where: {
        id,
      },
    });
  }

  count() {
    return this.prisma.video.count();
  }

  async submitAnalyzingResult(
    id: string,
    result: CreateAnalyzingResult,
  ): Promise<AnalyzingResult> {
    return await this.prisma.analyzingResult.create({
      data: {
        ...result,
        Video: {
          connect: {
            id,
          },
        },
      },
    });
  }

  /**
   * Submit a transcoding result to a video
   * @param id Video id
   * @param result Video transcoding result
   * @returns Video transcoding result
   */
  async submitTranscodingResult(
    id: string,
    result: Prisma.TranscodingCreateInput,
  ) {
    return await this.prisma.transcoding.create({
      data: {
        ...result,
        Video: {
          connect: {
            id,
          },
        },
      },
    });
  }
}
