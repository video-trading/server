import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { SignedUrl } from '../../storage/storage.service';
import { TranscodingStatus } from '@prisma/client';
import { VideoQuality } from '../../common/video';

export class CreateTranscodingDto {
  @ApiProperty()
  transcodingUrl: SignedUrl;

  @ApiProperty()
  videoUrl: SignedUrl;

  @ApiProperty()
  @IsString()
  videoId: string;

  @ApiProperty()
  @IsEnum(TranscodingStatus)
  status: TranscodingStatus;

  @ApiProperty()
  @IsEnum(VideoQuality)
  targetQuality: VideoQuality;
}
