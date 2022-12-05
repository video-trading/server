import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { AMQPModule } from '@enriqcg/nestjs-amqp';
import { CreateVideoDto } from './dto/create-video.dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { UnauthorizedException } from '@nestjs/common';

describe('VideoService', () => {
  let service: VideoService;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = mongod.getUri('video');
    const module: TestingModule = await Test.createTestingModule({
      imports: [AMQPModule.forRoot({})],
      providers: [VideoService, PrismaService, BlockchainService],
    }).compile();

    service = module.get<VideoService>(VideoService);
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
    await prisma.video.deleteMany();
    await prisma.user.deleteMany();
  });

  it('Should be able to create a video', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);
    const videos = await service.findAll(1);
    expect(videos.items).toHaveLength(1);
  });

  it('Should be able to update video', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await service.findAll(1);
    expect(videos.items).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos.items[0].id, {
      title: 'Updated Video',
    });
    expect(updatedVideo.title).toBe('Updated Video');
  });

  it('Should be able to delete video', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await service.findAll(1);
    expect(videos.items).toHaveLength(1);
    expect(await service.count()).toBe(1);

    await service.remove(videos.items[0].id, userId);
    expect(await service.count()).toBe(0);
  });

  it('Should not be able to delete video', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await service.findAll(1);
    expect(videos.items).toHaveLength(1);
    expect(await service.count()).toBe(1);
    await expect(() =>
      service.remove(videos.items[0].id, 'randomId'),
    ).rejects.toThrow();
  });
});
