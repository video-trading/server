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
import process from 'process';
import {
  AmqpConnection,
  AmqpConnectionManager,
  RabbitMQModule,
} from '@golevelup/nestjs-rabbitmq';

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

jest.mock('braintree', () => ({
  Environment: {
    Sandbox: 'sandbox',
  },
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: {
      generate: jest.fn().mockImplementation(() => ({
        clientToken: 'client',
      })),
    },
    transaction: {
      sale: jest.fn().mockImplementation(() => ({
        transaction: {
          id: 'id',
          amount: 'amount',
          status: 'status',
          success: true,
        },
        success: true,
      })),
    },
  })),
}));

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
  let accessKey2: string;
  let userId: string;
  let userId2: string;
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
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = mongod.getUri('video');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RabbitMQModule)
      .useValue({})
      .overrideProvider(AmqpConnection)
      .useValue(() => ({
        publish: jest.fn(),
        getConnections: jest.fn(),
      }))
      .overrideProvider(AmqpConnectionManager)
      .useValue(() => ({
        createChannel: jest.fn(),
        url: {
          heartbeat: 1,
        },
        getConnections: jest.fn(),
      }))
      .useMocker((token) => {
        if (token === AmqpConnection) {
          return {
            publish: jest.fn(),
          };
        }
      })
      .compile();

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

    const user2 = await userService.create({
      email: '2',
      name: '2',
      password: 'password',
      username: 'abc2',
    });

    userId = user.id;
    userId2 = user2.id;

    accessKey = jwt.sign({ userId: userId }, Environments.jwt_secret);
    accessKey2 = jwt.sign({ userId: userId2 }, Environments.jwt_secret);

    await app.init();
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await prisma.salesLockInfo.deleteMany();
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
    await request(app.getHttpServer())
      .patch(`/video/${videoId}/uploaded`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200);

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
        length: 20,
        frameRate: '40',
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
      .send({ quality: '360p', status: 'COMPLETED' })
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('COMPLETED');
      });
  });

  it('Should be able to upload video for sale', async () => {
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
        SalesInfo: {
          price: 100,
        },
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('id', videoId);
        expect(response.body).toHaveProperty('title', 'Updated Video');
        expect(response.body).toHaveProperty('fileName', 'test.mov');
      });

    await request(app.getHttpServer())
      .patch(`/video/${videoId}/uploaded`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200);

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
        length: 20,
        frameRate: '40',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.length).toBe(6);
      });

    // get token from client
    await request(app.getHttpServer())
      .get(`/payment/client_token`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('token');
      });

    // make a payment
    await request(app.getHttpServer())
      .post(`/payment/checkout`)
      .set('Authorization', `Bearer ${accessKey2}`)
      .send({
        nonce: 'fake-valid-nonce',
        amount: 100,
        videoId,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('txHash');
        expect(prisma.salesLockInfo.count()).resolves.toBe(0);
        expect(prisma.salesInfo.count()).resolves.toBe(1);
      });
  });

  it("Should be able to update video's sales info", async () => {
    const response = await request(app.getHttpServer())
      .post('/video')
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        title: 'Test Video',
        fileName: 'test.mov',
        description: 'Test Video',
      });

    const videoId = response.body.video.id;

    await request(app.getHttpServer())
      .patch(`/video/${videoId}/uploaded`)
      .set('Authorization', `Bearer ${accessKey}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/video/${videoId}/publish`)
      .set('Authorization', `Bearer ${accessKey}`)
      .send({
        SalesInfo: {
          price: 100,
        },
        title: 'Test Video',
        description: 'Test Video',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('success');
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
