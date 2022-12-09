import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { User, Video } from '@prisma/client';
import { VideoQuality } from 'src/common/video';
import * as process from 'process';

export enum Operation {
  GET = 'getObject',
  HEAD = 'headObject',
  PUT = 'putObject',
}

export interface SignedUrl {
  /**
   * Granted PutObject permission
   */
  url: string;
  key: string;
  /**
   * Granted Get Object permission
   */
  previewUrl?: string;
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
    if (operation === Operation.GET) {
      const key = user.avatar;
      const params = {
        Bucket: process.env.SERVER_AWS_BUCKET_NAME,
        Key: key,
      };
      const url = await getSignedUrl(
        this.s3,
        this.getCommand(operation, params),
        {
          expiresIn: 60 * 60,
        },
      );
      return { url, key, previewUrl: url };
    }

    const key = `Avatars/${user.id}/${user.id}_${user.version + 1}.png`;
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: key,
    };

    const url = await getSignedUrl(
      this.s3,
      this.getCommand(operation, params),
      {
        expiresIn: 60 * 60,
      },
    );

    const previewUrl = await getSignedUrl(
      this.s3,
      this.getCommand(Operation.GET, params),
      { expiresIn: 60 * 60 },
    );

    return {
      previewUrl,
      url,
      key,
    };
  }

  /**
   * Will get presigned url for video
   * @param video
   * @param operation
   */
  async generatePreSignedUrlForVideo(
    video: Video,
    operation: Operation = Operation.PUT,
  ): Promise<SignedUrl> {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: this.getUploadVideoKey(video),
    };

    const signedUrl = await getSignedUrl(
      this.s3,
      this.getCommand(operation, params),
      {
        expiresIn: 60 * 60,
      },
    );

    return {
      url: signedUrl,
      key: params.Key,
      previewUrl: signedUrl,
    };
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
   * Upload avatar to S3. This method is used for auto generated avatars
   * @param user
   * @param avatarData
   */
  async uploadAvatar(
    userId: string,
    avatarData: any,
  ): Promise<{ url: string; key: string }> {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: `Avatars/${userId}/${userId}.png`,
      ContentType: 'image/png',
      Body: Buffer.from(avatarData, 'base64'),
    };
    await this.s3.send(new PutObjectCommand(params));

    const url = process.env.SERVER_AWS_PUBLIC_URL + '/' + params.Key;
    return {
      url,
      key: params.Key,
    };
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

  deleteFile(key: string) {
    const params = {
      Bucket: process.env.SERVER_AWS_BUCKET_NAME,
      Key: key,
    };
    return this.s3.send(new DeleteObjectCommand(params));
  }
}
