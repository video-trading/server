import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    HeadObjectCommand: jest.fn().mockImplementation(),
    PutObjectCommand: jest.fn().mockImplementation(),
    GetObjectCommand: jest.fn().mockImplementation(),
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
jest.mock('axios', () => ({
  get: jest.fn().mockImplementation(),
  post: jest.fn().mockImplementation().mockReturnValue({ data: {} }),
}));

describe('UserService', () => {
  let service: UserService;
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
      providers: [
        UserService,
        BlockchainService,
        PrismaService,
        StorageService,
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('Should be able to create user', async () => {
    const user = await service.create({
      email: '',
      password: '',
      name: '',
      username: '',
    });
    expect(user).toBeDefined();
    expect(user.Wallet).toBeDefined();
    expect(user.Wallet.privateKey).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  it('Should be able to update user', async () => {
    const user = await service.create({
      email: '',
      password: '',
      name: '',
      username: '',
    });
    await service.update(user.id, {
      name: 'new name',
    });
    let updatedUser = await service.findOne(user.id);
    expect(updatedUser.name).toBe('new name');

    await service.update(user.id, {
      avatar: 'Avatar/a.png',
    });
    updatedUser = await service.findOne(user.id);
    expect(updatedUser.avatar).toBe('Avatar/a.png');
  });
});
