import { PartialType } from '@nestjs/swagger';
import { CreateVideoDto } from './create-video.dto';

export class UpdateUserDto extends PartialType(CreateVideoDto) {}
