import { Video, VideoStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetVideoDto implements Video {
  @ApiProperty({
    enum: VideoStatus,
  })
  status: VideoStatus;
  @ApiProperty()
  id: string;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty()
  title: string;
  @ApiProperty()
  fileName: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  url: string;
  @ApiProperty()
  thumbnail: string;
  @ApiProperty()
  views: number;
  @ApiProperty()
  likes: number;
  @ApiProperty()
  dislikes: number;
  @ApiProperty()
  userId: string;
  @ApiProperty()
  playlistId: string;
  @ApiProperty()
  version: number;
}
