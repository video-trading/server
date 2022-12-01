import { ApiProperty } from '@nestjs/swagger';
import { VideoQuality } from '../../common/video';

export class CreateAnalyzingResult {
  @ApiProperty({
    enum: VideoQuality,
    description: 'Analyzed video quality',
  })
  quality: VideoQuality;
}
