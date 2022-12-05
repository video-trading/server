import { HttpException, Injectable } from '@nestjs/common';
import { AnalyzingResult, Prisma, TranscodingStatus } from '@prisma/client';
import { Operation, StorageService } from '../storage/storage.service';
import { VideoQuality } from '../common/video';
import { PrismaService } from '../prisma.service';
import { UpdateTranscodingDto } from './dto/update-transcoding.dto';

@Injectable()
export class TranscodingService {
  constructor(
    private readonly prismService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  create(data: Prisma.TranscodingUncheckedCreateInput) {
    return this.prismService.transcoding.create({
      data,
    });
  }

  /**
   * Find transcodings by video id
   * @param videoId Video to be transcoded
   * @returns Transcoding objects
   */
  async findAll(videoId: string) {
    const transcodingsPromise = this.prismService.transcoding.findMany({
      where: {
        videoId: videoId,
      },
    });

    const videoPromise = this.prismService.video.findUnique({
      where: {
        id: videoId,
      },
    });

    const [transcodings, video] = await Promise.all([
      transcodingsPromise,
      videoPromise,
    ]);

    return transcodings.map((transcoding) => ({
      ...transcoding,
      url:
        transcoding.status === TranscodingStatus.COMPLETED
          ? this.storageService.generatePreSignedUrlForTranscoding(
              video,
              transcoding.targetQuality as any,
              Operation.GET,
            )
          : undefined,
    }));
  }

  async update(videoId: string, status: UpdateTranscodingDto) {
    if (status.status === TranscodingStatus.COMPLETED) {
      const video = await this.prismService.video.findUnique({
        where: {
          id: videoId,
        },
      });
      const exists = await this.storageService.checkIfTranscodedVideoExists(
        video,
        status.quality,
      );
      if (!exists) {
        throw new HttpException(
          "Transcoded video doesn't exist in S3 storage",
          400,
        );
      }
    }

    return this.prismService.transcoding.update({
      where: {
        videoId_targetQuality: {
          videoId: videoId,
          targetQuality: status.quality,
        },
      },
      data: {
        status: status.status,
      },
    });
  }

  remove(id: string) {
    return this.prismService.transcoding.delete({
      where: { id },
    });
  }

  async createTranscodingsWithVideo(analyzingResult: AnalyzingResult) {
    // get video
    const video = await this.prismService.video.findUnique({
      where: {
        id: analyzingResult.videoId,
      },
    });
    const transcodings = this.getTranscodings(analyzingResult.quality as any);
    // create a list of pre-signed upload urls based on the video quality
    const presignedUrls = await Promise.all(
      transcodings.map((quality) =>
        this.storageService.generatePreSignedUrlForTranscoding(video, quality),
      ),
    );
    // create transcoding objects
    const videoQualities: Prisma.TranscodingUncheckedCreateInput[] =
      transcodings.map((quality, index) => ({
        videoId: analyzingResult.videoId,
        targetQuality: quality as any,
        status: TranscodingStatus.PENDING,
        progress: 0,
        url: presignedUrls[index],
      }));

    await this.prismService.transcoding.createMany({
      data: videoQualities as any,
    });
    return videoQualities;
  }

  private getTranscodings(quality: VideoQuality): VideoQuality[] {
    if (quality === VideoQuality.Quality144p) {
      return [VideoQuality.Quality144p];
    }
    if (quality === VideoQuality.Quality240p) {
      return [VideoQuality.Quality144p, VideoQuality.Quality240p];
    }
    if (quality === VideoQuality.Quality360p) {
      return [
        VideoQuality.Quality144p,
        VideoQuality.Quality240p,
        VideoQuality.Quality360p,
      ];
    }
    if (quality === VideoQuality.Quality480p) {
      return [
        VideoQuality.Quality144p,
        VideoQuality.Quality240p,
        VideoQuality.Quality360p,
        VideoQuality.Quality480p,
      ];
    }
    if (quality === VideoQuality.Quality720p) {
      return [
        VideoQuality.Quality144p,
        VideoQuality.Quality240p,
        VideoQuality.Quality360p,
        VideoQuality.Quality480p,
        VideoQuality.Quality720p,
      ];
    }
    if (quality === VideoQuality.Quality1080p) {
      return [
        VideoQuality.Quality144p,
        VideoQuality.Quality240p,
        VideoQuality.Quality360p,
        VideoQuality.Quality480p,
        VideoQuality.Quality720p,
        VideoQuality.Quality1080p,
      ];
    }
    if (quality === VideoQuality.Quality2160p) {
      return [
        VideoQuality.Quality144p,
        VideoQuality.Quality240p,
        VideoQuality.Quality360p,
        VideoQuality.Quality480p,
        VideoQuality.Quality720p,
        VideoQuality.Quality1080p,
        VideoQuality.Quality2160p,
      ];
    }
    return [];
  }
}
