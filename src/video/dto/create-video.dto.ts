import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty()
  id?: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  fileName: string;
}
