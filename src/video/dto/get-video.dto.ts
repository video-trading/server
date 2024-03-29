import { Video, VideoStatus, SalesInfo } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetVideoDto implements Video {
  @ApiProperty()
  ownerId: string;
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
  categoryId: string;

  @ApiProperty({
    description: 'Video progress in percentage (0-100)',
  })
  progress: number;
}

export class GetVideoDetailDto extends GetVideoDto {
  @ApiProperty()
  User: any;

  @ApiProperty()
  Owner: any;

  @ApiProperty()
  transcodings: any;

  @ApiProperty({
    description: 'If video is purchasable based on the user',
  })
  purchasable: boolean;

  @ApiProperty({})
  SalesInfo: SalesInfo;

  @ApiProperty({})
  Category: any;
}
