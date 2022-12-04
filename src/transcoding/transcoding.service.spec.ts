import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { StorageService } from '../storage/storage.service';
import { TranscodingStatus, VideoQuality } from '../common/video';
import { PrismaService } from '../prisma.service';
import { VideoService } from '../video/video.service';
import { TranscodingService } from './transcoding.service';
import { CreateVideoDto } from '../video/dto/create-video.dto';
import { BlockchainService } from '../blockchain/blockchain.service';

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

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest
      .fn()
      .mockImplementation()
      .mockReturnValue('https://example.com'),
  };
});

describe('TranscodingService', () => {
  let service: TranscodingService;
  let prisma: PrismaService;
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
      providers: [
        TranscodingService,
        PrismaService,
        StorageService,
        BlockchainService,
      ],
    }).compile();

    service = module.get<TranscodingService>(TranscodingService);
    prisma = module.get<PrismaService>(PrismaService);

    const user = await prisma.user.create({
      data: {
        email: 'abc@abc.com',
        password: 'password',
        name: 'abc',
        username: 'abc',
        Wallet: {
          create: {
            address: '0x123',
            privateKey: '0x123',
          },
        },
      },
    });

    userId = user.id;
  });

  afterEach(async () => {
    await prisma.transcoding.deleteMany();
  });

  it('should be able to crud', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };

    const videoService = new VideoService(new PrismaService());
    const createdVideo = await videoService.create(video, userId);

    const transcoding: Prisma.TranscodingUncheckedCreateInput = {
      status: '',
      progress: 0,
      videoId: createdVideo.id,
      targetQuality: VideoQuality.Quality144p,
    };

    await service.create(transcoding);

    const transcodings = await service.findAll(createdVideo.id);
    expect(transcodings).toHaveLength(1);

    const updatedTranscoding = await service.update(createdVideo.id, {
      quality: VideoQuality.Quality144p,
      status: TranscodingStatus.COMPLETED,
    });
    expect(updatedTranscoding.status).toBe(TranscodingStatus.COMPLETED);
  });

  it('Should be able to create multiple transcoding', async () => {
    const video: CreateVideoDto = {
      title: 'Test Video',
      fileName: 'test-video.mp4',
      description: '',
    };

    const videoService = new VideoService(new PrismaService());
    const createdVideo = await videoService.create(video, userId);

    const transcodings = await service.createTranscodingsWithVideo({
      videoId: createdVideo.id,
      quality: VideoQuality.Quality360p,
    } as any);

    expect(transcodings.length).toBe(3);
  });
});
