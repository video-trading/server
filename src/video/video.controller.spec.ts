import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfigModule } from '@nestjs/config';
import { VideoQuality } from '../common/video';
import { TranscodingService } from '../transcoding/transcoding.service';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoStatus } from '@prisma/client';
import { CreateAnalyzingResult } from './dto/create-analyzing.dto';
import {
  AmqpConnection,
  AmqpConnectionManager,
} from '@golevelup/nestjs-rabbitmq';

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
describe('VideoController', () => {
  let controller: VideoController;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let userId: string;
  let categoryId: string;

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
    })
      .useMocker((token) => {
        if (token === AmqpConnection) {
          return {
            publish: jest.fn(),
          };
        } else if (token === AmqpConnectionManager) {
          return {
            createChannel: jest.fn(),
            url: {
              heartbeat: 1,
            },
          };
        }
      })
      .compile();
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

    const category = await prisma.category.create({
      data: {
        name: 'test',
      },
    });

    userId = user.id;
    categoryId = category.id;
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
    };

    const result = await controller.create(video, { user: { userId } });
    expect(result.preSignedURL).toBeDefined();
    const videos = await prisma.video.findMany();
    expect(videos).toHaveLength(1);
    expect(videos.length).toBe(1);

    const updatedVideo = await controller.update(
      videos[0].id,
      {
        title: 'Updated Video',
      },
      { user: { userId } },
    );
    expect(updatedVideo.title).toBe('Updated Video');
  });

  it('Should be able to find all', async () => {
    let videos = await controller.findAll('2', '1', undefined);
    expect(videos.items).toHaveLength(0);
    videos = await controller.findAll(undefined, '1', undefined);
    expect(videos.items).toHaveLength(0);
    videos = await controller.findAll(undefined, undefined, undefined);
    expect(videos.items).toHaveLength(0);
    videos = await controller.findAll('', '', undefined);
    expect(videos.items).toHaveLength(0);
  });

  it('Should not be able to find all', async () => {
    await expect(() =>
      controller.findAll('0', '1', undefined),
    ).rejects.toThrow();
    await expect(() =>
      controller.findAll('0', 'a', undefined),
    ).rejects.toThrow();
    await expect(() =>
      controller.findAll('a', '1', undefined),
    ).rejects.toThrow();
  });

  it('Should not be able to find all by category', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'test',
      },
    });

    const category2 = await prisma.category.create({
      data: {
        name: 'test2',
      },
    });

    await prisma.video.create({
      data: {
        title: 'Test Video',
        description: '',
        fileName: 'test-video.mp4',
        status: VideoStatus.READY,
        Category: {
          connect: {
            id: category.id,
          },
        },
        User: {
          connect: {
            id: userId,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
      },
    });

    await prisma.video.create({
      data: {
        title: 'Test Video 2',
        description: '',
        fileName: 'test-video.mp4',
        status: VideoStatus.READY,
        Category: {
          connect: {
            id: category2.id,
          },
        },
        User: {
          connect: {
            id: userId,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
      },
    });

    let videos = await controller.findAll('1', '1', category.id);
    expect(videos.items).toHaveLength(1);
    expect(videos.metadata.total).toBe(1);

    videos = await controller.findAll('1', '1', category2.id);
    expect(videos.items).toHaveLength(1);
    expect(videos.metadata.total).toBe(1);
  });

  it('Should not be able to find all by category within the subcategories', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'test',
      },
    });

    const category2 = await prisma.category.create({
      data: {
        name: 'test2',
      },
    });

    const category3 = await prisma.category.create({
      data: {
        name: 'test3',
        parent: {
          connect: {
            id: category.id,
          },
        },
      },
    });

    const category4 = await prisma.category.create({
      data: {
        name: 'test4',
        parent: {
          connect: {
            id: category2.id,
          },
        },
      },
    });

    await prisma.video.create({
      data: {
        title: 'Test Video',
        description: '',
        fileName: 'test-video.mp4',
        status: VideoStatus.READY,
        Category: {
          connect: {
            id: category3.id,
          },
        },
        User: {
          connect: {
            id: userId,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
      },
    });

    await prisma.video.create({
      data: {
        title: 'Test Video 2',
        description: '',
        fileName: 'test-video.mp4',
        status: VideoStatus.READY,
        Category: {
          connect: {
            id: category4.id,
          },
        },
        User: {
          connect: {
            id: userId,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
      },
    });

    let videos = await controller.findAll('1', '1', category.id);
    expect(videos.items).toHaveLength(1);
    expect(videos.metadata.total).toBe(1);

    videos = await controller.findAll('1', '1', category2.id);
    expect(videos.items).toHaveLength(1);
    expect(videos.metadata.total).toBe(1);
  });

  it('Should be able to submit transcoding request', async () => {
    const video: CreateVideoDto = {
      description: '',
      title: 'Test Video',
      fileName: 'test-video.mp4',
    };

    const result = await controller.create(video, { user: { userId } });
    await controller.onUploaded(result.video.id, { user: { userId } });
    await controller.publish(
      result.video.id,
      {
        title: 'Test Video',
        description: '',
        SalesInfo: undefined,
        categoryId: categoryId,
      },
      { user: { userId } },
    );
    const analyzeResult: CreateAnalyzingResult = {
      quality: VideoQuality.Quality360p,
      frameRate: '30',
      length: 20,
    };
    await controller.submitAnalyzingResult(result.video.id, analyzeResult, {
      user: { userId },
    });
    expect(await prisma.transcoding.count()).toBe(3);
  });

  it('Should be able to publish transcoding request', async () => {
    const video: CreateVideoDto = {
      description: '',
      title: 'Test Video',
      fileName: 'test-video.mp4',
    };

    const result = await controller.create(video, { user: { userId } });
    await controller.onUploaded(result.video.id, { user: { userId } });
    await controller.publish(
      result.video.id,
      {
        title: 'Test Video',
        description: 'Hello world',
        categoryId: categoryId,
      },
      { user: { userId } },
    );
    const updatedVideo = await prisma.video.findUnique({
      where: { id: result.video.id },
    });
    expect(updatedVideo.status).toBe(VideoStatus.ANALYZING);
  });

  it('Should be able to my videos', async () => {
    const video: CreateVideoDto = {
      description: '',
      title: 'Test Video',
      fileName: 'test-video.mp4',
    };

    const result = await controller.create(video, { user: { userId } });
    await prisma.video.update({
      where: { id: result.video.id },
      data: {
        status: VideoStatus.READY,
      },
    });

    const myVideos = await controller.findMyUploads(
      { user: { userId } },
      undefined,
      undefined,
    );
    const videos = await controller.findUserVideos(
      userId,
      undefined,
      undefined,
    );
    expect(myVideos.items).toHaveLength(1);
    expect(videos.items).toHaveLength(1);
  });
});
