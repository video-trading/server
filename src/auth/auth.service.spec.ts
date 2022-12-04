import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { VideoController } from '../video/video.controller';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

describe('Given a auth service', function () {
  let userService: UserService;
  let mongod: MongoMemoryReplSet;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    process.env.DATABASE_URL = mongod.getUri('video');
    const prisma = new PrismaService();
    userService = new UserService(prisma);
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
