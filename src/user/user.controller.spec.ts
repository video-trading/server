import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { UserService } from './user.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { BlockchainService } from '../blockchain/blockchain.service';

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

describe('UserController', () => {
  let controller: UserController;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;

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
      controllers: [UserController],
      providers: [
        PrismaService,
        StorageService,
        UserService,
        BlockchainService,
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Should be able to get avatar pre-signed url', async () => {
    const user = await prisma.user.create({
      data: {
        email: '',
        name: 'John Doe',
        password: '',
        username: 'johndoe',
        Wallet: {
          create: {
            address: '',
            privateKey: '',
          },
        },
      },
    });

    const { url, key } = await controller.createAvatar({
      user: {
        userId: user.id,
      },
    });
    expect(url).toBeDefined();
    expect(key).toBeDefined();
  });

  it('Should be able to get user profile', async () => {
    const user = await prisma.user.create({
      data: {
        email: '',
        name: 'John Doe',
        password: '',
        username: 'johndoe',
        Wallet: {
          create: {
            address: '',
            privateKey: '',
          },
        },
      },
    });

    const profile = await controller.profile({
      user: {
        userId: user.id,
      },
    });
    expect(profile).toBeDefined();
    expect(profile.id).toEqual(user.id);
  });
});
