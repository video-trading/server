import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyzingResult, Video, VideoStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { config } from '../common/utils/config/config';
import { getPaginationMetaData, Pagination } from '../common/pagination';
import { Operation, StorageService } from '../storage/storage.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { PublishVideoDto } from './dto/publish-video.dto';
import { GetMyVideoDto } from './dto/get-my-video.dto';
import { TranscodingService } from '../transcoding/transcoding.service';
import { GetMyVideoDetailDto } from './dto/get-my-video-detail.dto';
import { v4 as uuidv4 } from 'uuid';
import { GetVideoDetailDto, GetVideoDto } from './dto/get-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private readonly transcodingService: TranscodingService,
  ) {}

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
        Owner: {
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
    const filter: { [key: string]: any } = {
      status: VideoStatus.READY,
    };

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

    const [videosResult, totalResult] = await Promise.all([videos, total]);
    const preSignedUrls = await Promise.all(
      videosResult.map(async (video) => {
        if (!video.thumbnail) {
          return undefined;
        }
        return this.storage.generatePreSignedUrlForThumbnail(video);
      }),
    );

    return {
      items: videosResult.map((video, index) => ({
        ...video,
        thumbnail: preSignedUrls[index]?.previewUrl,
      })),
      metadata: getPaginationMetaData(page, per, totalResult),
    };
  }

  async findOne(id: string): Promise<GetVideoDetailDto> {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
      include: {
        SalesInfo: true,
        Category: true,
        User: true,
        Owner: true,
      },
    });
    const transcodings = await this.transcodingService.findAll(id);

    const videoUrl =
      video.status === VideoStatus.READY
        ? await this.storage.generatePreSignedUrlForVideo(video)
        : undefined;
    const thumbnailUrl =
      video.status === VideoStatus.READY
        ? await this.storage.generatePreSignedUrlForThumbnail(video)
        : undefined;
    const userAvatarUrl = await this.storage.generatePreSignedUrlForAvatar(
      video.User,
    );

    const transcodingsWithUrl = await Promise.all(
      transcodings.map(async (transcoding) => {
        const url = await this.storage.generatePreSignedUrlForTranscoding(
          video,
          transcoding.targetQuality as any,
        );
        return {
          ...transcoding,
          url: url.previewUrl,
        };
      }),
    );

    return {
      ...video,
      url: videoUrl?.previewUrl,
      thumbnail: thumbnailUrl?.previewUrl,
      progress: 100,
      User: {
        ...video.User,
        avatar: userAvatarUrl?.previewUrl,
      },
      transcodings: transcodingsWithUrl,
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
          tokenId: uuidv4(),
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
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
    });

    if (video.status !== VideoStatus.ANALYZING) {
      throw new BadRequestException('Video is not ready for analyzing');
    }

    const analyzingResult = await this.prisma.analyzingResult.upsert({
      where: {
        videoId: id,
      },
      update: {
        frameRate: result.frameRate,
        length: result.length,
        quality: result.quality,
        Video: {
          connect: {
            id,
          },
        },
      },
      create: {
        frameRate: result.frameRate,
        length: result.length,
        quality: result.quality,
        Video: {
          connect: {
            id,
          },
        },
      },
    });

    const thumbnail = this.storage.getUploadThumbnailKey(video);
    // check if thumbnail exists
    const exists = await this.storage.checkIfThumbnailExists(video);

    // update video's status and thumbnail
    await this.prisma.video.update({
      where: {
        id,
      },
      data: {
        status: VideoStatus.TRANSCODED,
        thumbnail: exists ? thumbnail : undefined,
      },
    });
    return analyzingResult;
  }

  /**
   * Will get list of videos belong to the user and the status is ready
   * @param userId User id
   * @param page  Page number
   * @param per  Number of items per page
   */
  async findVideosByUser(userId: string, page: number, per: number) {
    const filter = {
      userId,
      status: VideoStatus.READY,
    };

    const videosPromise = await this.prisma.video.findMany({
      where: filter,
      include: {
        SalesInfo: true,
      },
      skip: (page - 1) * per,
      take: per,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalResultPromise = await this.prisma.video.count({
      where: filter,
    });

    const [videos, totalResult] = await Promise.all([
      videosPromise,
      totalResultPromise,
    ]);

    return {
      items: videos,
      metadata: getPaginationMetaData(page, per, totalResult),
    };
  }

  /**
   * Find video by user group by date
   * @param userId  User id
   * @param page  Page number
   * @param per Number of items per page
   */
  async findMyVideos(
    userId: string,
    page: number,
    per: number,
  ): Promise<Pagination<GetMyVideoDto>> {
    const pipeline = [
      {
        $match: {
          userId: {
            $eq: userId,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          videos: {
            $addToSet: '$$ROOT',
          },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $skip: (page - 1) * per,
      },
      {
        $limit: per,
      },
    ];
    const videosPromise = this.prisma.video.aggregateRaw({
      pipeline: pipeline,
    });

    const count = this.prisma.video.aggregateRaw({
      pipeline: [...pipeline, { $count: 'total' }],
    });

    const [videos, totalResult] = await Promise.all([videosPromise, count]);
    const newVideosPromise = (videos as unknown as GetMyVideoDto[]).map(
      async (video) => {
        const videos = await Promise.all(
          video.videos.map(async (v) => {
            const thumbnail = v.thumbnail
              ? await this.storage.generatePreSignedUrl(v.thumbnail)
              : undefined;

            return {
              ...v,
              id: (v as any)._id.$oid,
              thumbnail: thumbnail,
              progress: this.getProgressByStatus(v.status),
            };
          }),
        );

        const sortedVideos = videos.sort((a, b) => {
          return b.id < a.id ? -1 : 1;
        });

        return {
          ...video,
          videos: sortedVideos,
        };
      },
    );

    const newVideos = await Promise.all(newVideosPromise);

    return {
      items: newVideos as any,
      metadata: getPaginationMetaData(
        page,
        per,
        (totalResult[0] as any)?.total,
      ),
    };
  }

  async findMyVideoDetailById(
    id: string,
    userId: string,
  ): Promise<GetMyVideoDetailDto> {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
      include: {
        SalesInfo: true,
        Category: true,
      },
    });

    if (video.userId !== userId) {
      throw new UnauthorizedException(
        "You don't have permission to access this video",
      );
    }
    if (video.thumbnail) {
      video.thumbnail = await this.storage.generatePreSignedUrl(
        video.thumbnail,
      );
    }
    // get transcodings
    const transcodingsPromise = this.transcodingService.findAll(id);
    const analyzingResultPromise = this.prisma.analyzingResult.findUnique({
      where: {
        videoId: id,
      },
    });

    const [transcodings, analyzingResult] = await Promise.all([
      transcodingsPromise,
      analyzingResultPromise,
    ]);

    return {
      ...video,
      transcodings: transcodings as any,
      analyzingResult: analyzingResult as any,
      progress: this.getProgressByStatus(video.status),
    };
  }

  async permissionCheck(video: Video, userId: string) {
    if (video?.userId !== userId) {
      throw new UnauthorizedException();
    }
  }

  getProgressByStatus(status: VideoStatus): number {
    const total = Object.keys(VideoStatus).length - 1;
    let i = 0;
    for (const [key, value] of Object.entries(VideoStatus)) {
      i++;
      if (value === status) {
        return (i / total) * 100;
      }
    }
  }
}
