import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { TransactionType } from './dto/get-transaction-by-user.dto';
import { StorageService } from '../storage/storage.service';
import dayjs from 'dayjs';

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

describe('TransactionService', () => {
  let service: TransactionService;
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
      providers: [TransactionService, PrismaService, StorageService],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
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
      },
    });

    videoId = video.id;
  });

  it('Should be able to create a transaction', async () => {
    const transaction = await service.create({
      fromUserId: userId,
      toUserId: userId2,
      txHash: 'abc',
      value: '10.00',
      videoId: videoId,
    });
    expect(transaction).toBeDefined();
    expect(transaction.fromId).toEqual(userId);
    expect(transaction.toId).toEqual(userId2);
    expect(transaction.txHash).toEqual('abc');
    expect(transaction.value).toEqual('10.00');
    expect(transaction.videoId).toEqual(videoId);
  });

  it("Should not be able to create a transaction if video doesn't exist", async () => {
    await expect(() =>
      service.create({
        fromUserId: userId,
        toUserId: userId2,
        txHash: 'abc',
        value: '10.00',
        videoId: '1',
      }),
    ).rejects.toThrowError();
  });

  it("Should not be able to create a transaction if fromUser doesn't exist", async () => {
    await expect(() =>
      service.create({
        fromUserId: '1',
        toUserId: userId2,
        txHash: 'abc',
        value: '10.00',
        videoId: videoId,
      }),
    ).rejects.toThrowError();
  });

  it("Should not be able to create a transaction if toUser doesn't exist", async () => {
    await expect(() =>
      service.create({
        fromUserId: userId,
        toUserId: '1',
        txHash: 'abc',
        value: '10.00',
        videoId: videoId,
      }),
    ).rejects.toThrowError();
  });

  it('Should be able to get a list of transactions by videoId', async () => {
    await service.create({
      fromUserId: userId,
      toUserId: userId2,
      txHash: 'abc',
      value: '10.00',
      videoId: videoId,
    });
    const transactions = await service.findTransactionsByVideoId(
      videoId,
      1,
      10,
    );
    expect(transactions).toBeDefined();
    expect(transactions.items).toHaveLength(1);
    expect(transactions.metadata.total).toEqual(1);
  });

  it('Should be able to get a list of transactions by fromUserId', async () => {
    await service.create({
      fromUserId: userId,
      toUserId: userId2,
      txHash: 'abc',
      value: '10.00',
      videoId: videoId,
    });
    const transactions = await service.findTransactionsByUserId(userId, 1, 10);
    expect(transactions).toBeDefined();
    expect(transactions.items).toHaveLength(1);
    expect(transactions.items[0].transactions[0].type).toEqual(
      TransactionType.SENT,
    );
    expect(typeof transactions.items[0].transactions[0].fromId).toEqual(
      'string',
    );
    expect(typeof transactions.items[0].transactions[0].toId).toEqual('string');
    expect(typeof transactions.items[0].transactions[0].videoId).toEqual(
      'string',
    );
    expect(transactions.metadata.totalPages).toBe(1);

    const transactions2 = await service.findTransactionsByUserId(
      userId2,
      1,
      10,
    );
    expect(transactions2).toBeDefined();
    expect(transactions2.items).toHaveLength(1);
    expect(transactions2.items[0].transactions[0].type).toEqual(
      TransactionType.RECEIVED,
    );
  });

  it('Should be able to get a list of transactions when no tx presents', async () => {
    const transactions = await service.findTransactionsByUserId(userId, 1, 10);
    expect(transactions).toBeDefined();
    expect(transactions.items).toHaveLength(0);
  });

  it('Should be able to purchase a video', async () => {
    const videoForSale = await prisma.video.create({
      data: {
        title: '1',
        description: '1',
        fileName: '1',
        User: {
          connect: {
            id: userId2,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
        SalesInfo: {
          create: {
            price: 10,
          },
        },
      },
    });

    const { can, reason } = await service.preCheckTransaction(
      videoForSale.id,
      userId,
      userId2,
    );
    expect(reason).toBeUndefined();
    expect(can).toBeTruthy();
  });

  it('Should not be able to purchase a video if video is not for sale', async () => {
    const videoForSale = await prisma.video.create({
      data: {
        title: '1',
        description: '1',
        fileName: '1',
        User: {
          connect: {
            id: userId2,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
      },
    });

    const { can, reason } = await service.preCheckTransaction(
      videoForSale.id,
      userId,
      userId2,
    );
    expect(reason).toEqual('Video not for sale');
    expect(can).toBeFalsy();
  });

  it('Should not be able to purchase video if video is locked and user is not the lock owner', async () => {
    const videoForSale = await prisma.video.create({
      data: {
        title: '1',
        description: '1',
        fileName: '1',
        User: {
          connect: {
            id: userId2,
          },
        },
        Owner: {
          connect: {
            id: userId,
          },
        },
        SalesInfo: {
          create: {
            price: 10,
          },
        },
        SalesLockInfo: {
          create: {
            lockedBy: {
              connect: {
                id: userId3,
              },
            },
            lockUntil: new Date(Date.now() + 1000 * 60 * 60 * 24),
          },
        },
      },
    });

    const { can, reason } = await service.preCheckTransaction(
      videoForSale.id,
      userId,
      userId2,
    );
    expect(reason).toEqual('Video is locked');
    expect(can).toBeFalsy();
  });
});
