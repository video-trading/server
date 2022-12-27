import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PrismaService } from '../prisma.service';
import {
  GetTransactionByUserDto,
  TransactionType,
} from './dto/get-transaction-by-user.dto';
import { getPaginationMetaData, Pagination } from '../common/pagination';
import { TransactionHistory } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

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
  ): Promise<{ can: boolean; reason: string | undefined }> {
    try {
      const videoPromise = this.prisma.video.findUnique({
        where: {
          id: videoId,
        },
        include: {
          SalesInfo: true,
          SalesLockInfo: true,
        },
      });

      const fromUserPromise = this.prisma.user.findUnique({
        where: {
          id: fromUserId,
        },
      });

      const toUserPromise = this.prisma.user.findUnique({
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

      //TODO: uncomment this when when it is ready to purchase video from other users
      // if (fromUser.id === toUser.id) {
      //   return {
      //     can: false,
      //     reason: 'Cannot purchase your own video',
      //   };
      // }

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
   */
  async create(transaction: CreateTransactionDto) {
    return this.prisma.transactionHistory.create({
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
    });
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
    const filter = {
      OR: [
        {
          fromId: userId,
        },
        {
          toId: userId,
        },
      ],
    };

    const transactionsPromise = this.prisma.transactionHistory.findMany({
      where: filter,
      skip: (page - 1) * per,
      take: per,
    });

    const totalPromise = this.prisma.transactionHistory.count({
      where: filter,
    });

    const [transactions, total] = await Promise.all([
      transactionsPromise,
      totalPromise,
    ]);

    return {
      items: transactions.map<GetTransactionByUserDto>((t) => ({
        ...t,
        type:
          t.fromId === userId ? TransactionType.SENT : TransactionType.RECEIVED,
      })),
      metadata: getPaginationMetaData(page, per, total),
    };
  }

  /**
   * Get transaction by id
   * @param id
   */
  async get(id: string) {
    return this.prisma.transactionHistory.findUnique({
      where: {
        id,
      },
    });
  }
}
