import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';

import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { ConfigModule } from '@nestjs/config';
import { TranscodingService } from '../transcoding/transcoding.service';
import { VideoQuality } from '../common/videoQuality';

jest.mock('aws-sdk', () => ({
  S3: require('../utils/test-utils/aws-sdk.mock').S3,
}));

describe('VideoController', () => {
  let controller: VideoController;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;

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
      imports: [ConfigModule],
      controllers: [VideoController],
      providers: [
        VideoService,
        PrismaService,
        StorageService,
        TranscodingService,
      ],
    }).compile();
    controller = module.get<VideoController>(VideoController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prisma.transcoding.deleteMany();
    await prisma.analyzingResult.deleteMany();
    await prisma.video.deleteMany();
  });

  it('Should be able to CRUD', async () => {
    const video: Prisma.VideoCreateInput = {
      title: 'Test Video',
      createdAt: undefined,
      updatedAt: undefined,
      url: '',
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    };

    const result = await controller.create(video);
    expect(result.preSignedURL).toBeDefined();
    const videos = await controller.findAll();
    expect(videos.data).toHaveLength(1);
    expect(videos.total).toBe(1);

    const updatedVideo = await controller.update(videos.data[0].id, {
      title: 'Updated Video',
    });
    expect(updatedVideo.title).toBe('Updated Video');
  });

  it('Should be able to submit transcoding request', async () => {
    const video: Prisma.VideoCreateInput = {
      title: 'Test Video',
      createdAt: undefined,
      updatedAt: undefined,
      url: '',
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    };

    const result = await controller.create(video);
    const analyzeResult: any = {
      quality: VideoQuality.Quality360p,
    };
    await controller.updateAnalyzeResult(result.video.id, analyzeResult);
    expect(await prisma.transcoding.count()).toBe(3);
  });
});
