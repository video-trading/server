import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';

import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { ConfigModule } from '@nestjs/config';

jest.mock('aws-sdk', () => ({
  S3: require('../test-utils/aws-sdk.mock').S3,
}));

describe('VideoController', () => {
  let controller: VideoController;
  let mongod: MongoMemoryReplSet;

  beforeEach(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    process.env.DATABASE_URL = mongod.getUri('video');
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [VideoController],
      providers: [VideoService, PrismaService, StorageService],
    }).compile();
    controller = module.get<VideoController>(VideoController);
  });

  afterEach(async () => {
    await mongod.stop();
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
});
