import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePlaylistDto {
  @ApiProperty({
    description: 'Playlist name',
  })
  @IsString()
  name: string;
  @ApiProperty({
    description: 'Playlist description',
  })
  @IsString()
  description: string;
}
