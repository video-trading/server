import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Video } from '@prisma/client';
import { S3 } from 'aws-sdk';

@Injectable()
export class StorageService {
  s3: S3;

  constructor() {
    this.s3 = new S3({
      endpoint: process.env.AWS_ENDPOINT,
    });
  }

  async generatePreSignedUrl(video: Video) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `Video/${video.id}`,
      Expires: 60 * 60 * 24,
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }
}
