import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'User avatar',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'short description of the user',
  })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({
    description: 'long description of the user',
  })
  @IsString()
  @IsOptional()
  longDescription?: string;
}
