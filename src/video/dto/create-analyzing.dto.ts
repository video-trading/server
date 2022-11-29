import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { VideoQuality } from 'src/common/video';

export class CreateAnalyzingResult {
  @ApiProperty({
    enum: VideoQuality,
    description: 'Analyzed video quality',
  })
  quality: VideoQuality;
}
