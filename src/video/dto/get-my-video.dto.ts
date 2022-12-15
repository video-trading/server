import { ApiProperty } from '@nestjs/swagger';
import { GetVideoDto } from './get-video.dto';

export class GetMyVideoDto {
  @ApiProperty({
    description: 'Date when the video was created',
  })
  _id: string;
  @ApiProperty({
    description: 'List of video',
  })
  videos: GetVideoDto[];
}
