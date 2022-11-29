import { ApiProperty } from '@nestjs/swagger';
import { TranscodingStatus, VideoQuality } from '../../common/video';

export class UpdateTranscodingDto {
  @ApiProperty()
  quality: VideoQuality;

  @ApiProperty({
    description: 'Transcoding status',
    enum: TranscodingStatus,
  })
  status: TranscodingStatus;
}
