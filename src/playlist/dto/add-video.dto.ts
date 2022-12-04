import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddVideoDto {
  @ApiProperty({
    description: 'Video ID',
  })
  @IsString()
  videoId: string;
}
