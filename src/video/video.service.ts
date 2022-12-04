import { Injectable } from '@nestjs/common';
import { AnalyzingResult, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { config } from '../utils/config/config';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import { CreateVideoDto } from './dto/create-video.dto';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  create(video: CreateVideoDto, user: string) {
    return this.prisma.video.create({
      data: {
        ...video,
        user: {
          connect: {
            id: user,
          },
        },
      },
    });
  }

  findAll(page: number, limit: number = config.numberOfItemsPerPage) {
    return this.prisma.video.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findOne(id: string) {
    return this.prisma.video.findUnique({
      where: {
        id,
      },
    });
  }

  update(id: string, data: Prisma.VideoUpdateInput) {
    return this.prisma.video.update({
      where: {
        id,
      },
      data,
    });
  }

  remove(id: string) {
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
        video: {
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
        video: {
          connect: {
            id,
          },
        },
      },
    });
  }
}
