import { Prisma } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
  })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
  })
  password: string;

  @ApiProperty({
    description: 'The name of the user',
  })
  name: string;

  @ApiProperty({
    description: 'User name',
  })
  username: string;
}
