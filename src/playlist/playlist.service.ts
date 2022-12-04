import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { config } from '../common/utils/config/config';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { getPaginationMetaData } from '../common/pagination';

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find playlist by id
   * @param userId  User id
   * @param page - page number
   * @param per - number of items per page
   */
  findAll(
    userId: string,
    page: number = config.defaultStartingPage,
    per: number = config.numberOfItemsPerPage,
  ) {
    const items = this.prisma.playlist.findMany({
      where: {
        userId,
      },
      skip: (page - 1) * per,
      take: per,
    });

    const total = this.prisma.playlist.count({
      where: {
        userId,
      },
    });

    return Promise.all([items, total]).then(([items, total]) => {
      return {
        items,
        metadata: getPaginationMetaData(page, per, total),
      };
    });
  }

  /**
   * Find playlist by id
   */
  findOne(
    id: string,
    page: number = config.defaultStartingPage,
    per: number = config.numberOfItemsPerPage,
  ) {
    const playList = this.prisma.playlist.findUnique({
      where: {
        id,
      },
    });

    const videos = this.prisma.video.findMany({
      where: {
        playlistId: id,
      },
      skip: (page - 1) * per,
      take: per,
    });

    const totalVideos = this.prisma.video.count({
      where: {
        playlistId: id,
      },
    });

    return Promise.all([playList, videos, totalVideos]).then(
      ([playList, videos, total]) => {
        return {
          ...playList,
          videos: videos,
          metadata: getPaginationMetaData(page, per, total),
        };
      },
    );
  }

  /**
   * Create playlist
   */
  async create(data: CreatePlaylistDto, userId: string) {
    return this.prisma.playlist.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  /**
   * Update playlist
   */
  async update(id: string, userId: string, data: UpdatePlaylistDto) {
    const playList = await this.prisma.playlist.findUnique({
      where: {
        id,
      },
    });

    if (playList.userId !== userId) {
      throw new UnauthorizedException(
        null,
        'You are not authorized to update this playlist',
      );
    }

    return this.prisma.playlist.update({
      where: {
        id,
      },
      data,
    });
  }

  /**
   * Add video to playlist
   */
  async addVideo(playlistId: string, videoId: string, userId: string) {
    const playList = await this.prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (playList.userId !== userId) {
      throw new UnauthorizedException(
        null,
        'You are not authorized to update this playlist',
      );
    }

    return this.prisma.playlist.update({
      where: {
        id: playlistId,
      },
      data: {
        videos: {
          connect: {
            id: videoId,
          },
        },
      },
    });
  }

  /**
   * Remove video from playlist
   */
  async removeVideo(playlistId: string, videoId: string, userId: string) {
    const playList = await this.prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (playList.userId !== userId) {
      throw new UnauthorizedException(
        null,
        'You are not authorized to update this playlist',
      );
    }

    return this.prisma.playlist.update({
      where: {
        id: playlistId,
      },
      data: {
        videos: {
          disconnect: {
            id: videoId,
          },
        },
      },
    });
  }

  /**
   * Delete playlist
   */
  async delete(id: string, userId: string) {
    const playList = await this.prisma.playlist.findUnique({
      where: {
        id,
      },
    });

    if (playList.userId !== userId) {
      throw new UnauthorizedException(
        null,
        'You are not authorized to delete this playlist',
      );
    }

    return this.prisma.playlist.delete({
      where: {
        id,
      },
    });
  }
}
