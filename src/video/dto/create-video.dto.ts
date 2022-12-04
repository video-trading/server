import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  fileName: string;
}
