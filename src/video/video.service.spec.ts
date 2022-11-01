import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AMQPModule } from '@enriqcg/nestjs-amqp';

describe('VideoService', () => {
  let service: VideoService;
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
      imports: [AMQPModule.forRoot({})],
      providers: [VideoService, PrismaService],
    }).compile();

    service = module.get<VideoService>(VideoService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prisma.video.deleteMany();
  });

  it('Should be able to create a video', async () => {
    const video: Prisma.VideoCreateInput = {
      title: 'Test Video',
      url: '',
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    };
    await service.create(video);
    const videos = await service.findAll(1);
    expect(videos).toHaveLength(1);
  });

  it('Should be able to update video', async () => {
    const video: Prisma.VideoCreateInput = {
      title: 'Test Video',
      url: '',
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    };
    await service.create(video);

    const videos = await service.findAll(1);
    expect(videos).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos[0].id, {
      title: 'Updated Video',
    });
    expect(updatedVideo.title).toBe('Updated Video');
  });
});
