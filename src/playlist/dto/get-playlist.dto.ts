import { ApiProperty } from '@nestjs/swagger';
import { Playlist } from '@prisma/client';

export class GetPlaylistDetailsDto implements Playlist {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  userId: string;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty()
  id: string;
}
