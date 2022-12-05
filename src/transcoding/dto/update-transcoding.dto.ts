import { ApiProperty } from '@nestjs/swagger';
import { VideoQuality } from '../../common/video';
import { TranscodingStatus } from '@prisma/client';

export class UpdateTranscodingDto {
  @ApiProperty()
  quality: VideoQuality;

  @ApiProperty({
    description: 'Transcoding status',
    enum: TranscodingStatus,
  })
  status: TranscodingStatus;
}
