import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyzingResult, Prisma, Video, VideoStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { config } from '../common/utils/config/config';
import { getPaginationMetaData } from '../common/pagination';
import { Operation, StorageService } from '../storage/storage.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { PublishVideoDto } from './dto/publish-video.dto';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  create(video: CreateVideoDto, user: string) {
    return this.prisma.video.create({
      data: {
        ...video,
        status: VideoStatus.UPLOADING,
        User: {
          connect: {
            id: user,
          },
        },
      },
    });
  }

  async findAll(
    page: number = config.defaultStartingPage,
    per: number = config.numberOfItemsPerPage,
    categoryId: string | undefined = undefined,
  ) {
    const filter: { [key: string]: any } = {};

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: categoryId,
        },
        include: {
          subCategories: true,
        },
      });
      const categoryIds = [
        categoryId,
        ...category?.subCategories.map((c) => c.id),
      ];
      filter.categoryId = {
        in: categoryIds,
      };
    }

    const videos = this.prisma.video.findMany({
      skip: (page - 1) * per,
      take: per,
      where: filter,
      include: {
        User: true,
        Category: true,
      },
    });

    const total = this.prisma.video.count({
      where: filter,
    });

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
      include: {
        SalesInfo: true,
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

  async update(id: string, userId: string, data: UpdateVideoDto) {
    if (data.SalesInfo === null) {
      // delete sales info
      await this.prisma.salesInfo.delete({
        where: {
          videoId: id,
        },
      });
    }

    if (data.SalesInfo) {
      // update sales info
      await this.prisma.salesInfo.upsert({
        where: {
          videoId: id,
        },
        update: data.SalesInfo,
        create: {
          ...data.SalesInfo,
          Video: {
            connect: {
              id,
            },
          },
        },
      });
    }

    return this.prisma.video.update({
      where: {
        id,
      },
      data: {
        ...data,
        SalesInfo: undefined,
        version: {
          increment: 1,
        },
      },
      include: {
        SalesInfo: true,
      },
    });
  }

  async onVideoUploaded(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: {
        id: videoId,
      },
    });

    if (!video) {
      throw new BadRequestException();
    }

    if (video.status === VideoStatus.UPLOADING) {
      // if user update video key, we need to check if the video is ready
      const exists = await this.storage.checkIfVideoExists(video);
      if (!exists) {
        throw new BadRequestException("Video doesn't exist in the storage");
      }
    }

    if (video.status === VideoStatus.UPLOADING) {
      await this.prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          status: VideoStatus.UPLOADED,
        },
      });
    }
  }

  /**
   * Publish an existing video
   * @param videoId Video id
   * @param data  Video publish data
   */
  async publish(videoId: string, data: PublishVideoDto) {
    const video = await this.prisma.video.findUnique({
      where: {
        id: videoId,
      },
    });

    if (video.status !== VideoStatus.UPLOADED) {
      throw new BadRequestException('Video is not ready for publishing');
    }

    if (data.SalesInfo) {
      // update sales info
      await this.prisma.salesInfo.upsert({
        where: {
          videoId: videoId,
        },
        update: data.SalesInfo,
        create: {
          ...data.SalesInfo,
          Video: {
            connect: {
              id: videoId,
            },
          },
        },
      });
    }

    return this.prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        ...data,
        SalesInfo: undefined,
        status: VideoStatus.ANALYZING,
      },
      include: {
        SalesInfo: true,
      },
    });
  }

  /**
   * Set video status to transcoding
   * @param videoId
   */
  async startTranscoding(videoId: string) {
    await this.prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        status: VideoStatus.TRANSCODING,
      },
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

  async permissionCheck(video: Video, userId: string) {
    if (video?.userId !== userId) {
      throw new UnauthorizedException();
    }
  }
}
