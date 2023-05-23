import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchVideoResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  thumbnail: string;
}
