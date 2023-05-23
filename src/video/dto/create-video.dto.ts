import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Video } from '@prisma/client';
import { SignedUrl } from '../../storage/storage.service';

export class CreateVideoDto {
  @ApiProperty({
    title: 'Video title',
    description: 'Video title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    title: 'Video description',
    description: 'Video description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    title: 'Video file name',
    description:
      'Video file name. This is useful for creating a pre-signed upload URL.',
  })
  @IsString()
  fileName: string;
}

// {
//   "id": "646c778dd1520cc7a07d19da",
//   "createdAt": "2023-05-23T08:21:32.862Z",
//   "updatedAt": "2023-05-23T08:21:32.862Z",
//   "title": "Test Video",
//   "fileName": "test.mov",
//   "description": "My Video",
//   "thumbnail": null,
//   "views": 0,
//   "likes": 0,
//   "dislikes": 0,
//   "userId": "646c25c3264079fcdd936446",
//   "playlistId": null,
//   "status": "UPLOADING",
//   "version": 0,
//   "categoryId": null,
//   "ownerId": "646c25c3264079fcdd936446"
// }
class CreateVideoResponseVideo {
  @ApiProperty({
    description: 'Video id',
  })
  id: string;
  @ApiProperty({
    description: 'Created date',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'Updated date',
  })
  updatedAt: Date;
  @ApiProperty({
    description: 'Video title',
  })
  title: string;
  @ApiProperty({
    description: 'Video file name',
  })
  fileName: string;
  @ApiProperty({
    description: 'Video description',
  })
  description: string;
  @ApiProperty({
    description: 'Video thumbnail',
  })
  thumbnail: string;
  @ApiProperty({
    description: 'Number of views',
  })
  views: number;
  @ApiProperty({
    description: 'Number of likes',
  })
  likes: number;
  @ApiProperty({
    description: 'Number of dislikes',
  })
  dislikes: number;
  @ApiProperty({
    description: 'User id',
  })
  userId: string;
  @ApiProperty({
    description: 'Playlist id',
  })
  playlistId: string;
  @ApiProperty({
    description: 'Video status',
  })
  status: string;
  @ApiProperty({
    description: 'Video version',
  })
  version: number;
  @ApiProperty({
    description: 'Category id',
  })
  categoryId: string;
  @ApiProperty({
    description: 'Owner id',
  })
  ownerId: string;
}

export class CreateVideoResponse {
  @ApiProperty({
    description: 'Video object',
  })
  video: CreateVideoResponseVideo;
  @ApiProperty({
    description: 'Pre-signed URL for uploading the video',
  })
  preSignedURL: SignedUrl;
}
