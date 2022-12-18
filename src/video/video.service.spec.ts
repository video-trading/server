import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { AMQPModule } from '@enriqcg/nestjs-amqp';
import { CreateVideoDto } from './dto/create-video.dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';
import { VideoStatus } from '@prisma/client';
import { VideoQuality } from '../common/video';
import { ConfigModule } from '@nestjs/config';
import { TranscodingService } from '../transcoding/transcoding.service';
import { UnauthorizedException } from '@nestjs/common';

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
  let userId2: string;

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
      imports: [ConfigModule, AMQPModule.forRoot({})],
      providers: [
        VideoService,
        PrismaService,
        BlockchainService,
        StorageService,
        TranscodingService,
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

    const user2 = await prisma.user.create({
      data: {
        email: 'abc@abc.com',
        password: 'password',
        name: 'abc2',
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
    userId2 = user2.id;
  });

  afterEach(async () => {
    await prisma.analyzingResult.deleteMany();
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
    expect(videos.items).toHaveLength(0);
  });

  it('Should be able to update video without sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await prisma.video.findMany();
    expect(videos).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos[0].id, userId, {
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

    const videos = await prisma.video.findMany();
    expect(videos).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos[0].id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
        tokenId: '20',
      },
    });
    expect(updatedVideo.title).toBe('Updated Video');
    expect(updatedVideo.SalesInfo.price).toBe(20);
  });

  it('Should be able to create multiple videos with sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const video1 = await service.create(video, userId);
    const video2 = await service.create(video, userId);

    const updatedVideo1 = await service.update(video1.id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
        tokenId: '20',
      },
    });

    const updatedVideo2 = await service.update(video2.id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
        tokenId: '20',
      },
    });

    expect(updatedVideo1.title).toBe('Updated Video');
    expect(updatedVideo1.SalesInfo.price).toBe(20);
    expect(updatedVideo2.title).toBe('Updated Video');
    expect(updatedVideo2.SalesInfo.price).toBe(20);
  });

  it('Should be able to publish video with sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await prisma.video.findMany();
    expect(videos).toHaveLength(1);
    expect(await service.count()).toBe(1);

    const updatedVideo = await service.update(videos[0].id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
        tokenId: '20',
      },
    });

    await service.onVideoUploaded(updatedVideo.id);

    const publishedVideo = await service.publish(updatedVideo.id, {
      description: 'HHH',
      title: 'Hello world',
      SalesInfo: {
        price: 30,
      },
    });

    expect(publishedVideo.title).toBe('Hello world');
    expect(publishedVideo.SalesInfo.price).toBe(30);
  });

  it('Should be able to update video and delete sales info', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);
    expect(createdVideo.status).toBe(VideoStatus.UPLOADING);

    await service.onVideoUploaded(createdVideo.id);
    await service.update(createdVideo.id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 20,
      },
    });

    await service.update(createdVideo.id, userId, {
      title: 'Updated Video',
      SalesInfo: {
        price: 30,
      },
    });

    const updatedVideo = await service.update(createdVideo.id, userId, {
      SalesInfo: null,
    });
    expect(updatedVideo.title).toBe('Updated Video');
    expect(updatedVideo.SalesInfo).toBeNull();
    expect(updatedVideo.status).toBe(VideoStatus.UPLOADED);
  });

  it('Should be able to delete video', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await prisma.video.findMany();
    expect(videos).toHaveLength(1);
    expect(await service.count()).toBe(1);

    await service.remove(videos[0].id, userId);
    expect(await service.count()).toBe(0);
  });

  it('Should not be able to delete video', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    await service.create(video, userId);

    const videos = await prisma.video.findMany();
    expect(videos).toHaveLength(1);
    expect(await service.count()).toBe(1);
    await expect(() =>
      service.remove(videos[0].id, 'randomId'),
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

    await prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.UPLOADED },
    });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.FAILED },
    });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.TRANSCODING },
    });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).not.toBeDefined();

    await prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.READY },
    });
    foundVideo = await service.findOne(video.id);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.url).toBeDefined();
  });

  it('Should be able to update analyzing result', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);
    await service.onVideoUploaded(createdVideo.id);
    await service.publish(createdVideo.id, {
      SalesInfo: undefined,
      description: '',
      title: '',
    });
    const analyzingResult = await service.submitAnalyzingResult(
      createdVideo.id,
      {
        quality: VideoQuality.Quality360p,
        length: 20,
        frameRate: '40',
      },
    );

    const newVideo = await prisma.video.findUnique({
      where: { id: createdVideo.id },
    });
    expect(newVideo.thumbnail).toBeDefined();
    expect(analyzingResult.quality).toBe(VideoQuality.Quality360p);
  });

  it('Should be able to find videos by user id', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);
    await service.create(video, userId);
    await service.create(video, userId);
    await service.create(video, userId2);
    await service.create(video, userId2);

    await prisma.video.update({
      where: { id: createdVideo.id },
      data: { status: VideoStatus.READY },
    });

    const videos = await service.findVideosByUser(userId, 1, 10);
    expect(videos.items).toHaveLength(1);

    const videos2 = await service.findVideosByUser(userId2, 1, 10);
    expect(videos2.items).toHaveLength(0);
  });

  it('Should be able to find my videos', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);
    const createdVideo2 = await service.create(video, userId);
    const createdVideo3 = await service.create(video, userId);
    const createdVideo4 = await service.create(video, userId2);
    const createdVideo5 = await service.create(video, userId2);

    await prisma.video.update({
      where: { id: createdVideo.id },
      data: { status: VideoStatus.READY },
    });

    await prisma.video.update({
      where: { id: createdVideo2.id },
      data: { status: VideoStatus.READY },
    });

    await prisma.video.update({
      where: { id: createdVideo3.id },
      data: { status: VideoStatus.READY },
    });

    await prisma.video.update({
      where: { id: createdVideo4.id },
      data: { status: VideoStatus.READY },
    });

    await prisma.video.update({
      where: { id: createdVideo5.id },
      data: { status: VideoStatus.READY },
    });

    const videos = await service.findMyVideos(userId, 1, 2);
    expect(videos.items).toHaveLength(1);
    expect(videos.items[0].videos).toHaveLength(3);
    expect(videos.metadata.total).toBe(1);
  });

  it('Should return a proper video progress', () => {
    const progress = service.getProgressByStatus(VideoStatus.UPLOADED);
    expect(progress).toBe((2 / 7) * 100);

    const progress2 = service.getProgressByStatus(VideoStatus.TRANSCODING);
    expect(progress2).toBe((5 / 7) * 100);

    const progress3 = service.getProgressByStatus(VideoStatus.READY);
    expect(progress3).toBe(100);
  });

  it('Should be able to get my video by id', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };
    const createdVideo = await service.create(video, userId);
    const foundVideo = await service.findMyVideoDetailById(
      createdVideo.id,
      userId,
    );
    expect(foundVideo).toBeDefined();
    expect(foundVideo.transcodings).toHaveLength(0);
    expect(foundVideo.progress).toBeDefined();

    await expect(() =>
      service.findMyVideoDetailById(createdVideo.id, 'userId'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
