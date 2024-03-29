import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';
import { TranscodingController } from './transcoding.controller';
import { TranscodingService } from './transcoding.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { VideoQuality } from '../common/video';
import { Prisma, TranscodingStatus, VideoStatus } from '@prisma/client';
import { VideoService } from '../video/video.service';
import { HttpException } from '@nestjs/common';
import { CreateVideoDto } from '../video/dto/create-video.dto';
import { ConfigModule } from '@nestjs/config';
import {
  AmqpConnection,
  AmqpConnectionManager,
} from '@golevelup/nestjs-rabbitmq';

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
  let prisma: PrismaService;
  let service: TranscodingService;

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
      controllers: [TranscodingController],
      providers: [
        TranscodingService,
        PrismaService,
        TranscodingService,
        StorageService,
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

    controller = module.get<TranscodingController>(TranscodingController);
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
      fileName: 'test-video.mp4',
      description: '',
    };

    const videoService = new VideoService(
      new PrismaService(),
      new StorageService(),
      service,
    );
    const transcodingService = new TranscodingService(
      new PrismaService(),
      new StorageService(),
    );
    const createdVideo = await videoService.create(video, userId);

    const transcoding: Prisma.TranscodingUncheckedCreateInput = {
      status: TranscodingStatus.COMPLETED,
      videoId: createdVideo.id,
      targetQuality: VideoQuality.Quality144p,
    };

    await transcodingService.create(transcoding);
    await prisma.video.update({
      where: { id: createdVideo.id },
      data: {
        status: VideoStatus.TRANSCODING,
      },
    });

    const result = await controller.update(createdVideo.id, {
      quality: VideoQuality.Quality144p,
      status: TranscodingStatus.COMPLETED,
    });
    expect(result.status).toBe(TranscodingStatus.COMPLETED);
  });
});
