import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { User, Video } from '@prisma/client';
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

  /**
   * Will get presigned url for user's avatar
   * @param user User
   * @param operation Operation
   */
  async generatePreSignedUrlForAvatar(
    user: User,
    operation: Operation = Operation.PUT,
  ) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: `Avatars/${user.id}/${user.id}.png`,
    };

    return getSignedUrl(this.s3, this.getCommand(operation, params), {
      expiresIn: 60 * 60,
    });
  }

  /**
   * Will get presigned url for video
   * @param video
   * @param operation
   */
  async generatePreSignedUrlForVideo(
    video: Video,
    operation: Operation = Operation.PUT,
  ) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getUploadVideoKey(video),
    };

    return getSignedUrl(this.s3, this.getCommand(operation, params), {
      expiresIn: 60 * 60,
    });
  }

  /**
   * Will get presigned url for transcoded video
   * @param video
   * @param quality
   * @param operation
   */
  async generatePreSignedUrlForTranscoding(
    video: Video,
    quality: VideoQuality,
    operation: Operation = Operation.PUT,
  ) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getTranscodingVideoKey(video, quality),
    };

    return getSignedUrl(this.s3, this.getCommand(operation, params), {
      expiresIn: 60 * 60,
    });
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

  /**
   * Check if avatar exists in S3
   * @param avatarKey
   */
  async checkIfAvatarExists(avatarKey: string) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: avatarKey,
    };

    try {
      await this.s3.send(new HeadObjectCommand(params));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Will the command for S3 based on operation
   * @param operation
   * @param params
   * @private
   */
  private getCommand(operation: Operation, params: any) {
    switch (operation) {
      case Operation.GET:
        return new GetObjectCommand(params);
      case Operation.HEAD:
        return new HeadObjectCommand(params);
      case Operation.PUT:
        return new PutObjectCommand(params);
    }
  }
}
