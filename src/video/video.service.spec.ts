import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { AMQPModule } from '@enriqcg/nestjs-amqp';
import { CreateVideoDto } from './dto/create-video.dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';
import { VideoStatus } from '@prisma/client';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    HeadObjectCommand: jest.fn().mockImplementation(),
    PutObjectCommand: jest.fn().mockImplementation(),
    GetObjectCommand: jest.fn().mockImplementation(),
    DeleteObjectCommand: jest.fn().mockImplementation(),
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn().mockImplementation(),
      };
    }),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest
      .fn()
      .mockImplementation()
      .mockReturnValue('https://example.com'),
  };
});

describe('VideoService', () => {
  let service: VideoService;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    process.env.DATABASE_URL = mongod.getUri('video');
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AMQPModule.forRoot({})],
      providers: [
        VideoService,
        PrismaService,
        BlockchainService,
        StorageService,
      ],
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

  it('Should be able to update video without sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await service.findAll(1);
    expect(videos.items).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos.items[0].id, userId, {
      title: 'Updated Video',
    });
    expect(updatedVideo.title).toBe('Updated Video');
  });

  it('Should be able to update video with sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await service.findAll(1);
    expect(videos.items).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos.items[0].id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
        tokenId: '20',
      },
    });
    expect(updatedVideo.title).toBe('Updated Video');
    expect(updatedVideo.SalesInfo.price).toBe(20);
  });

  it('Should be able to update video and delete sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);
    expect(createdVideo.status).toBe(VideoStatus.UPLOADING);

    await service.update(createdVideo.id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
        tokenId: '20',
      },
    });

    const updatedVideo = await service.update(createdVideo.id, userId, {
      SalesInfo: null,
    });
    expect(updatedVideo.title).toBe('Updated Video');
    expect(updatedVideo.SalesInfo).toBeNull();
    expect(updatedVideo.status).toBe(VideoStatus.UPLOADED);
  });

  it('Should not change video status if video status is not uploaded', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);

    await service.update(createdVideo.id, userId, {
      title: 'Updated Video',
      status: VideoStatus.READY,
    });

    const updatedVideo = await service.update(createdVideo.id, userId, {
      title: 'Updated Video',
    });

    expect(updatedVideo.title).toBe('Updated Video');
    expect(updatedVideo.status).toBe(VideoStatus.READY);
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

  it('Should be able to find video by id', async () => {
    let video: any = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    video = await service.create(video, userId);

    // should only get video's url when video status is ready
    let foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await service.update(video.id, userId, { status: VideoStatus.UPLOADING });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await service.update(video.id, userId, { status: VideoStatus.TRANSCODING });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await service.update(video.id, userId, { status: VideoStatus.FAILED });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await service.update(video.id, userId, { status: VideoStatus.READY });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).toBeDefined();
  });
});
