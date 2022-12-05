import { ApiProperty } from '@nestjs/swagger';
import { VideoQuality } from '../../common/video';
import { IsEnum } from 'class-validator';

export class CreateAnalyzingResult {
  @ApiProperty({
    enum: VideoQuality,
    description: 'Analyzed video quality',
  })
  @IsEnum(VideoQuality)
  quality: VideoQuality;
}
