import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transaction/transaction.service';
import { PrismaService } from '../prisma.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { UserService } from '../user/user.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';
import dayjs from 'dayjs';

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

describe('PaymentService', () => {
  let service: PaymentService;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let userId: string;
  let userId2: string;
  let userId3: string;
  let videoId: string;

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
        TransactionService,
        PrismaService,
        PaymentService,
        UserService,
        BlockchainService,
        StorageService,
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);

    const user = await prisma.user.create({
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

    const user2 = await prisma.user.create({
      data: {
        email: '2',
        password: '2',
        name: '2',
        username: '2',
        Wallet: {
          create: {
            privateKey: '2',
            address: '2',
          },
        },
      },
    });

    const user3 = await prisma.user.create({
      data: {
        email: '3',
        password: '3',
        name: '3',
        username: '3',
        Wallet: {
          create: {
            privateKey: '3',
            address: '3',
          },
        },
      },
    });

    userId = user.id;
    userId2 = user2.id;
    userId3 = user3.id;
  });

  afterEach(async () => {
    await prisma.salesLockInfo.deleteMany();
    await prisma.video.deleteMany();
  });

  it('Should be able to to make a payment', async () => {
    const video = await prisma.video.create({
      data: {
        title: '1',
        description: '1',
        fileName: '1',
        User: {
          connect: {
            id: userId,
          },
        },
        SalesInfo: {
          create: {
            price: 1,
          },
        },
      },
    });

    const payment = await service.createTransaction(
      '1',
      '1',
      video.id,
      userId,
      userId2,
    );

    expect(payment).toBeDefined();
    const locks = await prisma.salesLockInfo.findMany();
    expect(prisma.salesLockInfo.count()).resolves.toBe(0);
  });

  it('Should not be able to to make a payment if video is locked', async () => {
    const video = await prisma.video.create({
      data: {
        title: '1',
        description: '1',
        fileName: '1',
        User: {
          connect: {
            id: userId,
          },
        },
        SalesInfo: {
          create: {
            price: 1,
          },
        },
        SalesLockInfo: {
          create: {
            lockedBy: {
              connect: {
                id: userId3,
              },
            },
            lockUntil: dayjs().add(1, 'day').toDate(),
          },
        },
      },
    });

    await expect(() =>
      service.createTransaction('1', '1', video.id, userId, userId2),
    ).rejects.toThrowError();
    expect(prisma.salesLockInfo.count()).resolves.toBe(1);
  });
});
