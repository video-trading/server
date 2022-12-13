import { CreateTranscodingDto } from './create-transcoding.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetTranscodingDto extends PartialType(CreateTranscodingDto) {
  @ApiProperty()
  @IsString()
  id: string;
}
