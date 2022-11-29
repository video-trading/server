import { ApiBody, ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateVideoDto implements Prisma.VideoCreateInput {
  @ApiProperty()
  title: string;

  @ApiProperty()
  fileName: string;
}
