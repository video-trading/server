import { ApiProperty } from '@nestjs/swagger';
import { VideoQuality } from '../../common/video';
import { TranscodingStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTranscodingDto {
  @ApiProperty({
    enum: VideoQuality,
  })
  @IsEnum(VideoQuality)
  quality: VideoQuality;

  @ApiProperty({
    description: 'Transcoding status',
    enum: TranscodingStatus,
  })
  @IsEnum(TranscodingStatus)
  status: TranscodingStatus;
}
