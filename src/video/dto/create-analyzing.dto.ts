import { ApiProperty } from '@nestjs/swagger';
import { VideoQuality } from '../../common/video';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export class CreateAnalyzingResult {
  @ApiProperty({
    enum: VideoQuality,
    description: 'Analyzed video quality',
  })
  @IsEnum(VideoQuality)
  quality: VideoQuality;

  @ApiProperty({
    description: 'Analyzed video duration',
  })
  @IsNumber()
  length: number;

  @ApiProperty({
    description: 'Frames per second',
  })
  @IsString()
  frameRate: string;
}
