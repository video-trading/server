import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { Video } from '@prisma/client';

@Injectable()
export class StorageService {
  s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.SERVER_AWS_ENDPOINT,
      region: process.env.SERVER_AWS_REGION,
      credentials: {
        accessKeyId: process.env.SERVER_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.SERVER_AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async generatePreSignedUrlForUpload(video: Video) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: `Video/${video.id}/${video.fileName}`,
    };

    const command = new PutObjectCommand(params);

    return getSignedUrl(this.s3, command, { expiresIn: 60 * 60 });
  }
}
