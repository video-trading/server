import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';

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
      providers: [UserService, BlockchainService, PrismaService],
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
});
