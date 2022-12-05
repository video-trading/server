import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { Video } from '@prisma/client';
import { VideoQuality } from 'src/common/video';

export enum Operation {
  GET = 'getObject',
  HEAD = 'headObject',
  PUT = 'putObject',
}

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

  private getUploadVideoKey(video: Video) {
    return `Uploads/${video.id}/${video.fileName}`;
  }

  private getTranscodingVideoKey(video: Video, quality: VideoQuality) {
    return `Transcoding/${video.id}/${quality}/${video.fileName}`;
  }

  async generatePreSignedUrlForVideo(
    video: Video,
    operation: Operation = Operation.PUT,
  ) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getUploadVideoKey(video),
    };

    let command: GetObjectCommand | HeadObjectCommand | PutObjectCommand;

    switch (operation) {
      case Operation.GET:
        command = new GetObjectCommand(params);
        break;
      case Operation.HEAD:
        command = new HeadObjectCommand(params);
        break;
      case Operation.PUT:
        command = new PutObjectCommand(params);
        break;
    }

    return getSignedUrl(this.s3, command, { expiresIn: 60 * 60 });
  }

  async generatePreSignedUrlForTranscoding(
    video: Video,
    quality: VideoQuality,
    operation: Operation = Operation.PUT,
  ) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getTranscodingVideoKey(video, quality),
    };

    let command: GetObjectCommand | HeadObjectCommand | PutObjectCommand;

    switch (operation) {
      case Operation.GET:
        command = new GetObjectCommand(params);
        break;
      case Operation.HEAD:
        command = new HeadObjectCommand(params);
        break;
      case Operation.PUT:
        command = new PutObjectCommand(params);
        break;
    }

    return getSignedUrl(this.s3, command, { expiresIn: 60 * 60 });
  }

  /**
   * Will check if upload video exists in S3
   * @param video Video
   */
  async checkIfVideoExists(video: Video) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getUploadVideoKey(video),
    };

    try {
      await this.s3.send(new HeadObjectCommand(params));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Will check if transcoded video exists in S3
   * @param video Video
   * @param quality VideoQuality
   * @returns
   */
  async checkIfTranscodedVideoExists(video: Video, quality: VideoQuality) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getTranscodingVideoKey(video, quality),
    };

    try {
      await this.s3.send(new HeadObjectCommand(params));
      return true;
    } catch (error) {
      return false;
    }
  }
}
