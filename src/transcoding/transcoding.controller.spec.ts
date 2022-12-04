import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';
import { TranscodingController } from './transcoding.controller';
import { TranscodingService } from './transcoding.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { TranscodingStatus, VideoQuality } from '../common/video';
import { Prisma } from '@prisma/client';
import { VideoService } from '../video/video.service';
import { HttpException } from '@nestjs/common';
import { CreateVideoDto } from '../video/dto/create-video.dto';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    HeadObjectCommand: jest.fn().mockImplementation(),
    PutObjectCommand: jest.fn().mockImplementation(),
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn().mockImplementation(),
      };
    }),
  };
});

describe('TranscodingController', () => {
  let controller: TranscodingController;
  let mongod: MongoMemoryReplSet;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = mongod.getUri('video');
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranscodingController],
      providers: [
        TranscodingService,
        PrismaService,
        TranscodingService,
        StorageService,
      ],
    }).compile();

    controller = module.get<TranscodingController>(TranscodingController);
    const prisma = module.get<PrismaService>(PrismaService);

    const user = await prisma.user.create({
      data: {
        email: 'abc@abc.com',
        password: 'password',
        name: 'abc',
        username: 'abc',
      },
    });

    userId = user.id;
  });

  it('should not be able to update a video with id undefined', async () => {
    // expect to throw http exception
    await expect(() =>
      controller.update(undefined, {
        quality: VideoQuality.Quality144p,
        status: TranscodingStatus.COMPLETED,
      }),
    ).toThrow(HttpException);
  });

  it('should be able to update a video with id defined', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      url: '',
      fileName: 'test-video.mp4',
      description: '',
    };

    const videoService = new VideoService(new PrismaService());
    const transcodingService = new TranscodingService(
      new PrismaService(),
      new StorageService(),
    );
    const createdVideo = await videoService.create(video, userId);

    const transcoding: Prisma.TranscodingUncheckedCreateInput = {
      status: '',
      progress: 0,
      videoId: createdVideo.id,
      targetQuality: VideoQuality.Quality144p,
    };

    await transcodingService.create(transcoding);

    const result = await controller.update(createdVideo.id, {
      quality: VideoQuality.Quality144p,
      status: TranscodingStatus.COMPLETED,
    });
    expect(result.status).toBe(TranscodingStatus.COMPLETED);
  });
});
