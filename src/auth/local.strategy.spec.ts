import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import { LocalStrategy } from './local.strategy';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';

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
jest.mock('axios', () => ({
  get: jest.fn().mockImplementation(),
  post: jest.fn().mockImplementation().mockReturnValue({ data: {} }),
}));

describe('Given a local.strategy class', () => {
  let mongod: MongoMemoryReplSet;
  let userService: UserService;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    process.env.DATABASE_URL = mongod.getUri('video');
    userService = new UserService(
      new PrismaService(),
      new BlockchainService(),
      new StorageService(),
    );
    await userService.create({
      email: '',
      name: '',
      password: 'password',
      username: 'test',
    });
  });

  afterAll(async () => {
    await mongod.stop();
  });

  it('Should be able to login', async () => {
    const strategy = new LocalStrategy(
      new AuthService(new JwtService(), userService),
    );
    const user = await strategy.validate('test', 'password');
    expect(user).toBeDefined();
  });

  it('Should not be able to login', async () => {
    const strategy = new LocalStrategy(
      new AuthService(new JwtService(), userService),
    );
    await expect(() =>
      strategy.validate('test', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
