import { Injectable } from '@nestjs/common';
import { Prisma, Video, AnalyzingResult } from '@prisma/client';
import { TranscodingStatus, VideoQuality } from '../common/video';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TranscodingService {
  constructor(private readonly prismService: PrismaService) {}
  create(data: Prisma.TranscodingUncheckedCreateInput) {
    return this.prismService.transcoding.create({
      data,
    });
  }
  /**
   * Find transcodings by video id
   * @param video Video to be transcoded
   * @returns Transcoding objects
   */
  findAll(videoId: string) {
    return this.prismService.transcoding.findMany({
      where: {
        videoId: videoId,
      },
    });
  }
  update(id: string, status: TranscodingStatus) {
    return this.prismService.transcoding.update({
      where: { id },
      data: {
        status: status,
      },
    });
  }
  remove(id: string) {
    return this.prismService.transcoding.delete({
      where: { id },
    });
  }
  createTranscodingsWithVideo(analyzingResult: AnalyzingResult) {
    const transcodings = this.getTranscodings(analyzingResult.quality as any);
    const videoQualities: Prisma.TranscodingUncheckedCreateInput[] =
      transcodings.map((quality) => ({
        videoId: analyzingResult.videoId,
        targetQuality: quality as any,
        status: TranscodingStatus.PENDING,
        progress: 0,
      }));

    return this.prismService.transcoding.createMany({
      data: videoQualities as any,
    });
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
