import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { VideoQuality } from '../common/videoQuality';
import { PrismaService } from '../prisma.service';
import { VideoService } from '../video/video.service';
import { TranscodingStatus } from './transcoding.controller';
import { TranscodingService } from './transcoding.service';

describe('TranscodingService', () => {
  let service: TranscodingService;
  let prisma: PrismaService;
  let mongod: MongoMemoryReplSet;

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
      providers: [TranscodingService, PrismaService],
    }).compile();

    service = module.get<TranscodingService>(TranscodingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prisma.transcoding.deleteMany();
  });

  it('should be able to crud', async () => {
    const video: Prisma.VideoCreateInput = {
      title: 'Test Video',
      url: '',
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    };

    const videoService = new VideoService(new PrismaService());
    const createdVideo = await videoService.create(video);

    const transcoding: Prisma.TranscodingUncheckedCreateInput = {
      status: '',
      progress: 0,
      videoId: createdVideo.id,
      targetQuality: VideoQuality.Quality144p,
    };

    await service.create(transcoding);

    const transcodings = await service.findAll(createdVideo.id);
    expect(transcodings).toHaveLength(1);

    const updatedTranscoding = await service.update(
      transcodings[0].id,
      TranscodingStatus.COMPLETED,
    );
    expect(updatedTranscoding.status).toBe(TranscodingStatus.COMPLETED);
  });

  it('Should be able to create multiple transcodings', async () => {
    const video: Prisma.VideoCreateInput = {
      title: 'Test Video',
      url: '',
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    };

    const videoService = new VideoService(new PrismaService());
    const createdVideo = await videoService.create(video);

    const transcodings = await service.createTranscodingsWithVideo({
      videoId: createdVideo.id,
      quality: VideoQuality.Quality360p,
    } as any);

    expect(transcodings.count).toBe(3);
  });
});
