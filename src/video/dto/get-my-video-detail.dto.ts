import { PartialType } from '@nestjs/swagger';
import { GetVideoDto } from './get-video.dto';
import { GetTranscodingDto } from './get-transcoding.dto';

export class GetMyVideoDetailDto extends PartialType(GetVideoDto) {
  progress: number;
  transcodings: GetTranscodingDto[];

  analyzingResult: any;

  passedStatus: string[];
}
