import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateSalesInfoDto } from './update-video.dto';

export class PublishVideoDto {
  @ApiProperty({
    description: 'Video title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Video description in Rich Text Format',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Video's sales info",
  })
  @IsOptional()
  SalesInfo?: CreateSalesInfoDto;

  @ApiProperty({
    description: 'Category id',
  })
  categoryId: string;
}
