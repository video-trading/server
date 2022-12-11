import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { Environments } from '../src/common/environment';
import { UserService } from '../src/user/user.service';
import { PrismaService } from '../src/prisma.service';
import { VideoService } from '../src/video/video.service';

jest.mock('axios', () => ({
  get: jest.fn().mockImplementation(),
  post: jest.fn().mockImplementation().mockReturnValue({ data: {} }),
}));

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

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let accessKey: string;
  let userId: string;
  let prisma: PrismaService;
  let videoService: VideoService;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const userService = moduleFixture.get<UserService>(UserService);
    videoService = moduleFixture.get<VideoService>(VideoService);

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const user = await userService.create({
      email: '',
      name: '',
      password: 'password',
      username: 'abc',
    });

    userId = user.id;
    accessKey = jwt.sign({ userId: userId }, Environments.jwt_secret);
    await app.init();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('Should be able to signIn', async () => {
    await request(app.getHttpServer())
      .post('/auth/signUp')
      .send({
        email: '',
        name: '',
        password: 'testpassword',
        username: 'test',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/signIn')
      .send({
        username: 'test',
        password: 'testpassword',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
  });

  it('Should be able to create and update user avatar ', async () => {
    const response = await request(app.getHttpServer())
      .post(`/user/avatar`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(201);

    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('key');
    expect(response.body).toHaveProperty('previewUrl');

    const response2 = await request(app.getHttpServer())
      .patch(`/user/profile`)
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        avatar: '/avatar.png',
      })
      .expect(200);

    expect(response2.body).toHaveProperty('avatar', '/avatar.png');
  });

  it('Should be able to upload video', async () => {
    const response = await request(app.getHttpServer())
      .post('/video')
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        title: 'Test Video',
        fileName: 'test.mov',
        description: 'Test Video',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.video).toHaveProperty('id');
        expect(response.body.video).toHaveProperty('title', 'Test Video');
        expect(response.body.video).toHaveProperty('fileName', 'test.mov');
      });

    // get video by id
    const videoId = response.body.video.id;
    await request(app.getHttpServer())
      .get(`/video/${videoId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('id', videoId);
        expect(response.body).toHaveProperty('title', 'Test Video');
        expect(response.body).toHaveProperty('fileName', 'test.mov');
      });

    // update video by id
    await request(app.getHttpServer())
      .patch(`/video/${videoId}`)
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        title: 'Updated Video',
        description: 'Updated Video',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('id', videoId);
        expect(response.body).toHaveProperty('title', 'Updated Video');
        expect(response.body).toHaveProperty('fileName', 'test.mov');
      });

    // start analyzing process
    await request(app.getHttpServer())
      .post(`/video/${videoId}/publish`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('success');
      });

    // submit analyzing result
    await request(app.getHttpServer())
      .post(`/video/${videoId}/analyzing/result`)
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        quality: '1080p',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.length).toBe(6);
      });

    // get a list of transcodings by video id
    await request(app.getHttpServer())
      .get(`/transcoding/${videoId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBe(6);
      });

    // update transcoding status
    await request(app.getHttpServer())
      .patch(`/transcoding/${videoId}`)
      .send({
        status: 'COMPLETED',
        quality: '1080p',
      })
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('COMPLETED');
      });
  });

  it('Should be able to modify playlist', async () => {
    // create a video
    const response = await request(app.getHttpServer())
      .post('/video')
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        title: 'Test Video',
        fileName: 'test.mov',
        description: 'Test Video',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.video).toHaveProperty('id');
        expect(response.body.video).toHaveProperty('title', 'Test Video');
        expect(response.body.video).toHaveProperty('fileName', 'test.mov');
      });

    const videoId = response.body.video.id;

    // create playlist
    const playlist = await request(app.getHttpServer())
      .post('/playlist')
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        name: 'Test Playlist',
        description: 'Test Playlist',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name', 'Test Playlist');
      });

    // get playlist
    const playlistId = playlist.body.id;
    await request(app.getHttpServer())
      .get(`/playlist/${playlistId}`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('id', playlistId);
        expect(response.body).toHaveProperty('name', 'Test Playlist');
      });

    // add video to playlist
    await request(app.getHttpServer())
      .patch(`/playlist/${playlistId}/video`)
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        videoId: videoId,
      })
      .expect(200);
  });

  it('Should be able to get videos by page', async () => {
    // create 30 videos
    for (let i = 0; i < 30; i++) {
      await request(app.getHttpServer())
        .post('/video')
        .set('Authorization', `Bearer ${accessKey}`)
        .send({
          title: 'Test Video',
          fileName: 'test.mov',
          description: 'Test Video',
        })
        .expect(201);
    }

    // get videos by page
    await request(app.getHttpServer())
      .get('/video?page=1')
      .expect(200)
      .expect((response) => {
        expect(response.body.metadata.page).toBe(1);
      });

    await request(app.getHttpServer())
      .get('/video?page=2')
      .expect(200)
      .expect((response) => {
        expect(response.body.metadata.page).toBe(2);
      });
  });
});
