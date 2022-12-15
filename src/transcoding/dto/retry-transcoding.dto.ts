import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RetryTranscodingDto {
  @ApiProperty({
    description: 'video id',
  })
  @IsString()
  videoId: string;
}
