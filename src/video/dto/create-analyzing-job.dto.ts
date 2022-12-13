import { SignedUrl } from '../../storage/storage.service';

export interface CreateAnalyzingJobDto {
  videoId: string;
  video: SignedUrl;
  thumbnail: SignedUrl;
}
