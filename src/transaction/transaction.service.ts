import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PrismaService } from '../prisma.service';
import {
  FindTransactionsByUserIdCountSchema,
  GetTransactionByUserDto,
  TransactionType,
} from './dto/get-transaction-by-user.dto';
import { getPaginationMetaData, Pagination } from '../common/pagination';
import { PrismaClient, TransactionHistory } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { TransactionByDateAggregationResult } from './dto/transaction-by-date-aggregation-result';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Pre-check if video can be purchased
   * @param videoId video id
   * @param fromUserId  User id of the sender
   * @param toUserId    User who owns the video
   * @param amount  Amount to be transferred
   */
  async preCheckTransaction(
    videoId: string,
    fromUserId: string,
    toUserId: string,
    prisma: PrismaClient = this.prisma,
  ): Promise<{ can: boolean; reason: string | undefined }> {
    try {
      const videoPromise = prisma.video.findUnique({
        where: {
          id: videoId,
        },
        include: {
          SalesInfo: true,
          SalesLockInfo: true,
        },
      });

      const fromUserPromise = prisma.user.findUnique({
        where: {
          id: fromUserId,
        },
      });

      const toUserPromise = prisma.user.findUnique({
        where: {
          id: toUserId,
        },
      });

      const [video, fromUser, toUser] = await Promise.all([
        videoPromise,
        fromUserPromise,
        toUserPromise,
      ]);

      if (!video) {
        return {
          can: false,
          reason: 'Video not found',
        };
      }

      if (!fromUser) {
        return {
          can: false,
          reason: 'From user not found',
        };
      }

      if (!toUser) {
        return {
          can: false,
          reason: 'To user not found',
        };
      }

      if (fromUser.id === toUser.id) {
        return {
          can: false,
          reason: 'Cannot purchase your own video',
        };
      }

      if (video.SalesInfo === undefined || video.SalesInfo === null) {
        return {
          can: false,
          reason: 'Video not for sale',
        };
      }

      if (video.SalesLockInfo) {
        const lockInfo = video.SalesLockInfo;
        // check if lock is expired
        if (lockInfo.lockUntil > new Date() && lockInfo.userId !== fromUserId) {
          return {
            can: false,
            reason: 'Video is locked',
          };
        }
      }

      return {
        can: true,
        reason: undefined,
      };
    } catch (e) {
      return {
        can: false,
        reason: 'Internal server error',
      };
    }
  }

  /**
   * Create a new transaction
   * @param transaction
   * @param prisma Transaction client if already in a transaction
   */
  async create(
    transaction: CreateTransactionDto,
    prisma: PrismaClient = this.prisma,
  ) {
    const data = {
      data: {
        txHash: transaction.txHash,
        value: transaction.value,
        Video: {
          connect: {
            id: transaction.videoId,
          },
        },
        From: {
          connect: {
            id: transaction.fromUserId,
          },
        },
        To: {
          connect: {
            id: transaction.toUserId,
          },
        },
      },
    };
    if (prisma) {
      return prisma.transactionHistory.create(data);
    }
    return this.prisma.transactionHistory.create(data);
  }

  /**
   * Get all transactions by video id
   * @param videoId
   * @param page
   * @param per
   */
  async findTransactionsByVideoId(
    videoId: string,
    page: number,
    per: number,
  ): Promise<Pagination<TransactionHistory>> {
    const transactions = this.prisma.transactionHistory.findMany({
      where: {
        videoId,
      },
      include: {
        From: true,
        To: true,
      },
      skip: (page - 1) * per,
      take: per,
    });

    const total = this.prisma.transactionHistory.count({
      where: {
        videoId,
      },
    });

    const [data, count] = await Promise.all([transactions, total]);

    return {
      items: data,
      metadata: getPaginationMetaData(page, per, count),
    };
  }

  /**
   * Get all transactions by user id
   */
  async findTransactionsByUserId(
    userId: string,
    page: number,
    per: number,
  ): Promise<Pagination<GetTransactionByUserDto>> {
    const pipeline = [
      {
        $match: {
          $or: [
            {
              fromId: {
                $eq: {
                  $oid: userId,
                },
              },
            },
            {
              toId: {
                $eq: {
                  $oid: userId,
                },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'fromId',
          foreignField: '_id',
          as: 'From',
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'toId',
          foreignField: '_id',
          as: 'To',
        },
      },
      {
        $lookup: {
          from: 'Video',
          localField: 'videoId',
          foreignField: '_id',
          as: 'Video',
        },
      },
      {
        $unwind: {
          path: '$Video',
        },
      },
      {
        $unwind: {
          path: '$From',
        },
      },
      {
        $unwind: {
          path: '$To',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          transactions: {
            $addToSet: '$$ROOT',
          },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ];

    const transactionsPromise = this.prisma.transactionHistory.aggregateRaw({
      pipeline: [
        ...pipeline,
        {
          $skip: (page - 1) * per,
        },
        {
          $limit: per,
        },
      ],
    });

    const countPromise = this.prisma.transactionHistory.aggregateRaw({
      pipeline: [
        ...pipeline,
        {
          $count: 'count',
        },
      ],
    });

    const [transactions, count] = await Promise.all([
      transactionsPromise,
      countPromise,
    ]);

    const verifiedCount = FindTransactionsByUserIdCountSchema.parse(count);

    const transactionsWithVideo = await Promise.all(
      (transactions as unknown as TransactionByDateAggregationResult[]).map(
        async (transaction) => {
          const txWithVideos = transaction.transactions.map(async (tx) => {
            const video = {
              ...tx.Video,
              _id: tx.Video._id.$oid,
              id: tx.Video._id.$oid,
            };
            const coverUrl =
              await this.storage.generatePreSignedUrlForThumbnail(video);
            return {
              ...tx,
              id: tx._id.$oid,
              fromId: tx.fromId.$oid,
              toId: tx.toId.$oid,
              videoId: tx.videoId.$oid,
              Video: {
                ...video,
                thumbnail: coverUrl.previewUrl,
              },
              type:
                tx.fromId.$oid === userId
                  ? TransactionType.SENT
                  : TransactionType.RECEIVED,
            };
          });

          return {
            id: transaction._id,
            transactions: await Promise.all(txWithVideos),
          };
        },
      ),
    );

    return {
      items: transactionsWithVideo as any,
      metadata: getPaginationMetaData(page, per, verifiedCount[0]?.count ?? 0),
    };
  }

  /**
   * Get transaction by id
   * @param id
   */
  async get(id: string) {
    const transaction = await this.prisma.transactionHistory.findUnique({
      where: {
        id,
      },
      include: {
        From: true,
        To: true,
        Video: true,
      },
    });

    const url = await this.storage.generatePreSignedUrlForThumbnail(
      transaction.Video,
    );

    return {
      ...transaction,
      Video: {
        ...transaction.Video,
        thumbnail: url.previewUrl,
      },
    };
  }
}
