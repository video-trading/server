import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the user',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'The name of the user',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User name',
  })
  @IsString()
  username: string;
}
