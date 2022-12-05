import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistService } from './playlist.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';

describe('PlaylistService', () => {
  let service: PlaylistService;

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
      providers: [PlaylistService, PrismaService],
    }).compile();

    service = module.get<PlaylistService>(PlaylistService);
    prisma = module.get<PrismaService>(PrismaService);

    const user = await prisma.user.create({
      data: {
        email: '',
        password: '',
        name: '',
        username: '',
        Wallet: {
          create: {
            privateKey: '',
            address: '',
          },
        },
      },
    });
    userId = user.id;
  });

  it('Should be able to create a playlist', async () => {
    const playlist = await service.create(
      {
        name: 'playlist',
        description: "playlist's description",
      },
      userId,
    );
    expect(playlist).toBeDefined();
    expect(playlist.name).toEqual('playlist');
    expect(playlist.userId).toEqual(userId);
  });

  it('Should be able to update a playlist', async () => {
    const playlist = await service.create(
      {
        name: 'playlist',
        description: "playlist's description",
      },
      userId,
    );
    const updatedPlaylist = await service.update(playlist.id, userId, {
      name: 'updated playlist',
      description: "updated playlist's description",
    });
    expect(updatedPlaylist).toBeDefined();
    expect(updatedPlaylist.name).toEqual('updated playlist');
    expect(updatedPlaylist.description).toEqual(
      "updated playlist's description",
    );
  });

  it('Should be able to delete a playlist', async () => {
    const playlist = await service.create(
      {
        name: 'playlist',
        description: "playlist's description",
      },
      userId,
    );
    const deletedPlaylist = await service.delete(playlist.id, userId);
    expect(deletedPlaylist).toBeDefined();
    expect(deletedPlaylist.name).toEqual('playlist');
    expect(deletedPlaylist.description).toEqual("playlist's description");
  });

  it('Should be able to add a video to a playlist', async () => {
    const playlist = await service.create(
      {
        name: 'playlist',
        description: "playlist's description",
      },
      userId,
    );
    const video = await prisma.video.create({
      data: {
        description: '',
        title: 'Test Video',
        fileName: 'test-video.mp4',
        userId: userId,
      },
    });
    const updatedPlaylist = await service.addVideo(
      playlist.id,
      video.id,
      userId,
    );
    const playlistVideos = await service.findOne(playlist.id);
    expect(updatedPlaylist).toBeDefined();
    expect(playlistVideos.videos[0].id).toEqual(video.id);
  });

  it('Should be able to remove a video from a playlist', async () => {
    const playlist = await service.create(
      {
        name: 'playlist',
        description: "playlist's description",
      },
      userId,
    );
    const video = await prisma.video.create({
      data: {
        description: '',
        title: 'Test Video',
        fileName: 'test-video.mp4',
        userId: userId,
      },
    });
    const updatedPlaylist = await service.addVideo(
      playlist.id,
      video.id,
      userId,
    );
    const playlistVideos = await service.findOne(playlist.id);
    expect(updatedPlaylist).toBeDefined();
    expect(playlistVideos.videos[0].id).toEqual(video.id);
    const removedVideo = await service.removeVideo(
      playlist.id,
      video.id,
      userId,
    );
    const playlistVideos2 = await service.findOne(playlist.id);
    expect(removedVideo).toBeDefined();
    expect(playlistVideos2.videos.length).toEqual(0);
  });
});
