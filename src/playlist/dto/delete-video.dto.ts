import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AddVideoDto } from './add-video.dto';

export class DeleteVideoDto extends PartialType(AddVideoDto) {}
