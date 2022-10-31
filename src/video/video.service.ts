import { Injectable } from '@nestjs/common';
import { Video, Prisma, PrismaClient } from '@prisma/client';
import { config } from '../config/config';
import { PrismaService } from '../prisma.service';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  create(video: Prisma.VideoCreateInput) {
    return this.prisma.video.create({ data: video });
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
}
