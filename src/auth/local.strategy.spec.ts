import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import { LocalStrategy } from './local.strategy';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('Given a local.strategy class', () => {
  let mongod: MongoMemoryReplSet;
  let userService: UserService;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    process.env.DATABASE_URL = mongod.getUri('video');
    userService = new UserService(new PrismaService());
    const user = await userService.create({
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
