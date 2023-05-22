import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transaction/transaction.service';
import { PrismaService } from '../prisma.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { UserService } from '../user/user.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';
import * as process from 'process';
import { TokenService } from '../token/token.service';

jest.mock('braintree', () => ({
  Environment: {
    Sandbox: 'sandbox',
  },
  BraintreeGateway: jest.fn(),
}));

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
          wait: jest.fn(),
          hash: '1',
        })),
      };
    }),
  },
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;
  let userId: string;
  let userId2: string;
  let userId3: string;

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
        TokenService,
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
    await prisma.transactionHistory.deleteMany();
  });

  it('Should be able to to make a payment', async () => {
    const braintree = {
      clientToken: {
        generate: jest.fn().mockImplementation(() => ({
          clientToken: 'client',
        })),
      },
      transaction: {
        sale: jest.fn().mockImplementation(() => ({
          transaction: {
            id: 'id',
            amount: '10',
            status: 'status',
            success: true,
          },
          success: true,
        })),
      },
    };
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
        Owner: {
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

    service.gateway = braintree as any;
    const payment = await service.createTransaction('1', video.id, userId2);
    expect(payment).toBeDefined();
  });

  it('Should not add transaction if payment failed', async () => {
    const braintree = {
      clientToken: {
        generate: jest.fn().mockImplementation(() => ({
          clientToken: 'client',
        })),
      },
      transaction: {
        sale: jest.fn().mockRejectedValue(new Error('error')),
      },
    };
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
        Owner: {
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

    service.gateway = braintree as any;
    await expect(() =>
      service.createTransaction('1', video.id, userId2),
    ).rejects.toThrow('error');
    const count = await prisma.transactionHistory.count();
    expect(count).toBe(0);
  });
});
