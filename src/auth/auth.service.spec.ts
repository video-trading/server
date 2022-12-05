import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';

jest.mock('axios', () => ({
  get: jest.fn().mockImplementation(),
  post: jest.fn().mockImplementation().mockReturnValue({ data: {} }),
}));

describe('Given a auth service', function () {
  let userService: UserService;
  let mongod: MongoMemoryReplSet;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    process.env.DATABASE_URL = mongod.getUri('video');
    const prisma = new PrismaService();
    userService = new UserService(
      prisma,
      new BlockchainService(),
      new StorageService(),
    );
  });

  afterAll(async () => {
    await mongod.stop();
  });

  it('Should be able to signUp', async () => {
    const authService = new AuthService(new JwtService(), userService);
    const user = await authService.signUp({
      email: '',
      name: '',
      password: 'password',
      username: 'abc',
    });
    expect(user).toBeDefined();
  });
});
