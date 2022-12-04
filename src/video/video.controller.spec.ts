import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

import { AMQPModule } from '@enriqcg/nestjs-amqp';
import { ConfigModule } from '@nestjs/config';
import { VideoQuality } from '../common/video';
import { TranscodingService } from '../transcoding/transcoding.service';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';

jest.mock('aws-sdk', () => ({
  S3: require('../utils/test-utils/aws-sdk.mock').S3,
}));

describe('VideoController', () => {
  let controller: VideoController;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
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
      imports: [ConfigModule, AMQPModule.forRoot({})],
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

    const user = await prisma.user.create({
      data: {
        email: 'abc@abc.com',
        password: 'password',
        name: 'abc',
        username: 'abc',
        Wallet: {
          create: {
            privateKey: 'privateKey',
            address: 'address',
          },
        },
      },
    });

    userId = user.id;
  });

  afterEach(async () => {
    await prisma.transcoding.deleteMany();
    await prisma.analyzingResult.deleteMany();
    await prisma.video.deleteMany();
  });

  it('Should be able to CRUD', async () => {
    const video: CreateVideoDto = {
      description: '',
      title: 'Test Video',
      fileName: 'test-video.mp4',
      url: '',
    };

    const result = await controller.create(video, { user: { userId } });
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
    const video: CreateVideoDto = {
      description: '',
      title: 'Test Video',
      url: '',
      fileName: 'test-video.mp4',
    };

    const result = await controller.create(video, { user: { userId } });
    const analyzeResult: any = {
      quality: VideoQuality.Quality360p,
    };
    await controller.submitAnalyingResult(result.video.id, analyzeResult);
    expect(await prisma.transcoding.count()).toBe(3);
  });
});
