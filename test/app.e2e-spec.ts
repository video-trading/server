import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { Environments } from '../src/common/environment';
import { PrismaService } from '../src/prisma.service';
import { UserService } from '../src/user/user.service';

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

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let accessKey: string;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
  });

  afterAll(async () => {
    await mongod.stop();
    await mongod.cleanup();
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = mongod.getUri('video');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const userService = moduleFixture.get<UserService>(UserService);
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

    // start analyzing process
    await request(app.getHttpServer())
      .post(`/video/${videoId}/analyzing`)
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('success');
      });

    // submit analyzing result
    await request(app.getHttpServer())
      .post(`/video/${videoId}/analyzing/result`)
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
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('COMPLETED');
      });
  });
});
