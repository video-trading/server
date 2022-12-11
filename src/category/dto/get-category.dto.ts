import { Category } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetCategoryDto implements Category {
  @ApiProperty({
    description: 'The id of the category',
  })
  id: string;
  @ApiProperty({
    description: 'The name of the category',
  })
  name: string;
  @ApiProperty({
    description: 'The description of the category',
  })
  description: string;
  @ApiProperty({
    description: 'The createdAt of the category',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'The updatedAt of the category',
  })
  updatedAt: Date;
}
