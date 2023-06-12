import { TokenService } from './token.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => {
        return {
          getTransactionCount: jest.fn().mockImplementation(() => {
            return 1;
          }),
          getGasPrice: jest.fn().mockImplementation(() => {
            return 1;
          }),
        };
      }),
    },
    Wallet: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        sign: jest.fn().mockImplementation(() => {
          return {
            serialize: jest.fn(),
          };
        }),
      };
    }),
    Contract: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        balanceOf: jest.fn().mockResolvedValue(50),
        purchase: jest.fn().mockImplementation(() => ({
          wait: jest.fn(),
        })),
        canPurchase: jest.fn().mockResolvedValue(true),
        reward: jest.fn().mockImplementation(() => ({
          hash: '1',
          wait: jest.fn(),
        })),
        symbol: jest.fn().mockResolvedValue('symbol'),
      };
    }),
  },
}));

describe('TokenService', () => {
  let service: TokenService;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let user: User;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    process.env.DATABASE_URL = mongod.getUri('video');
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        PrismaService,
        StorageService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    prisma = module.get<PrismaService>(PrismaService);
    user = await prisma.user.create({
      data: {
        email: '1',
        password: '1',
        name: '1',
        username: '1',
        Wallet: {
          create: {
            privateKey: '1',
            address: '1',
          },
        },
      },
    });
  });

  it('Should be able to list my transaction when history is empty', async () => {
    const transactions = await service.getTokenHistory(user.id, 1, 1);
    expect(transactions.items).toHaveLength(0);
    expect(transactions.metadata.totalPages).toBe(0);
    expect(transactions.metadata.total).toBe(0);
    expect(transactions.metadata.page).toBe(1);
  });

  it('Should be able to list my transaction when history is not empty', async () => {
    const video = await prisma.video.create({
      data: {
        title: '1',
        description: '1',
        thumbnail: '1',
        Category: {
          create: {
            name: '1',
          },
        },
        Owner: {
          connect: {
            id: user.id,
          },
        },
        User: {
          connect: {
            id: user.id,
          },
        },
        fileName: '1',
      },
    });

    await prisma.$transaction(async (tx) => {
      await service.rewardToken(user.id, 100, video.id, tx as any);
    });

    const transactions = await service.getTokenHistory(user.id, 1, 1);
    expect(transactions.items).toHaveLength(1);
    expect(transactions.metadata.totalPages).toBe(1);
    expect(transactions.metadata.total).toBe(1);
    expect(transactions.metadata.page).toBe(1);
    expect(transactions.items[0].transactions[0].value).toBe('100 symbol');
  });
});
