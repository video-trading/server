import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';

describe('PlaylistController', () => {
  let controller: PlaylistController;

  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let userId: string;
  let userId2: string;

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
      controllers: [PlaylistController],
      providers: [PlaylistService, PrismaService],
    }).compile();

    controller = module.get<PlaylistController>(PlaylistController);
    prisma = module.get<PrismaService>(PrismaService);

    const user = await prisma.user.create({
      data: {
        email: '',
        password: '',
        name: '',
        username: '',
        Wallet: {
          create: {
            privateKey: 'a',
            address: '',
          },
        },
      },
    });
    const user2 = await prisma.user.create({
      data: {
        email: '',
        password: '',
        name: '',
        username: '',
        Wallet: {
          create: {
            privateKey: 'b',
            address: '',
          },
        },
      },
    });
    userId = user.id;
    userId2 = user2.id;
  });

  afterEach(async () => {
    await prisma.video.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.user.deleteMany();
  });

  it('Should be able to create a playlist', async () => {
    const playlist = await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );
    expect(playlist).toBeDefined();
    expect(playlist.name).toEqual('playlist');
    expect(playlist.userId).toEqual(userId);
  });

  it('Should be able to find all playlists', async () => {
    await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    await controller.create(
      {
        user: {
          userId: userId2,
        },
      },
      {
        name: 'playlist2',
        description: "playlist's description",
      },
    );

    const playlists = await controller.findAll(
      {
        user: {
          userId,
        },
      },
      1,
      1,
    );
    expect(playlists).toBeDefined();
    expect(playlists.items.length).toEqual(1);
    expect(playlists.items[0].name).toEqual('playlist');
    expect(playlists.items[0].userId).toEqual(userId);
  });

  it('Should be able to find list of playlists by page', async () => {
    await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    await controller.create(
      {
        user: {
          userId: userId,
        },
      },
      {
        name: 'playlist2',
        description: "playlist's description",
      },
    );

    const playlists = await controller.findAll(
      {
        user: {
          userId,
        },
      },
      1,
      1,
    );
    expect(playlists).toBeDefined();
    expect(playlists.items.length).toEqual(1);
    expect(playlists.items[0].name).toEqual('playlist');
    expect(playlists.items[0].userId).toEqual(userId);

    const playlists2 = await controller.findAll(
      {
        user: {
          userId,
        },
      },
      2,
      1,
    );
    expect(playlists2).toBeDefined();
    expect(playlists2.items.length).toEqual(2);
    expect(playlists2.items[1].name).toEqual('playlist2');
    expect(playlists2.items[1].userId).toEqual(userId);
  });

  it('Should be able to find a playlist by id', async () => {
    const playlist = await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    const playlistFound = await controller.findOne(playlist.id, 1, 1);
    expect(playlistFound).toBeDefined();
    expect(playlistFound.name).toEqual('playlist');
    expect(playlistFound.userId).toEqual(userId);
  });

  it('Should be able to update a playlist', async () => {
    const playlist = await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    const playlistUpdated = await controller.update(
      playlist.id,
      {
        name: 'playlist updated',
        description: "playlist's description updated",
      },
      {
        user: {
          userId,
        },
      },
    );
    expect(playlistUpdated).toBeDefined();
    expect(playlistUpdated.name).toEqual('playlist updated');
    expect(playlistUpdated.userId).toEqual(userId);
  });

  it('Should be able to delete a playlist', async () => {
    const playlist = await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    await controller.remove(playlist.id, {
      user: {
        userId,
      },
    });
    const playlistFound = await controller.findOne(playlist.id, 1, 1);
    expect(playlistFound.name).toBeUndefined();
  });

  it('Should be able to add a video to a playlist', async () => {
    const playlist = await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    const video = await prisma.video.create({
      data: {
        title: 'video',
        description: "video's description",
        thumbnail: 'https://www.youtube.com/watch?v=123',
        fileName: '123',
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

    const video2 = await prisma.video.create({
      data: {
        title: 'video2',
        description: "video's description",
        thumbnail: 'https://www.youtube.com/watch?v=123',
        fileName: '123',
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

    await controller.addVideo(
      playlist.id,
      { videoId: video.id },
      {
        user: {
          userId,
        },
      },
    );

    await controller.addVideo(
      playlist.id,
      { videoId: video2.id },
      {
        user: {
          userId,
        },
      },
    );

    const playlistFound = await controller.findOne(playlist.id, 1, 1);
    expect(playlistFound).toBeDefined();
    expect(playlistFound.videos.length).toEqual(1);
    expect(playlistFound.videos[0].id).toEqual(video.id);

    const playlistFound2 = await controller.findOne(playlist.id, 2, 1);
    expect(playlistFound2).toBeDefined();
    expect(playlistFound2.videos.length).toEqual(2);
    expect(playlistFound2.videos[1].id).toEqual(video2.id);
  });

  it('Should be able to remove a video from a playlist', async () => {
    const playlist = await controller.create(
      {
        user: {
          userId,
        },
      },
      {
        name: 'playlist',
        description: "playlist's description",
      },
    );

    const video = await prisma.video.create({
      data: {
        title: 'video',
        description: "video's description",
        thumbnail: 'https://www.youtube.com/watch?v=123',
        fileName: '123',
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

    await controller.addVideo(
      playlist.id,
      { videoId: video.id },
      {
        user: {
          userId,
        },
      },
    );

    await controller.removeVideo(
      playlist.id,
      { videoId: video.id },
      {
        user: {
          userId,
        },
      },
    );

    const playlistFound = await controller.findOne(playlist.id, 1, 2);
    expect(playlistFound).toBeDefined();
    expect(playlistFound.videos.length).toEqual(0);
  });
});
