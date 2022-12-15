import { PartialType } from '@nestjs/swagger';
import { AddVideoDto } from './add-video.dto';

export class DeleteVideoDto extends PartialType(AddVideoDto) {}
