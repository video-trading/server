import { BadRequestException, Injectable } from '@nestjs/common';
import braintree from 'braintree';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import dayjs from 'dayjs';
import { config } from '../common/utils/config/config';
import { TransactionHistory } from '@prisma/client';
import { TokenService } from 'src/token/token.service';

@Injectable()
export class PaymentService {
  private gateway: braintree.BraintreeGateway;

  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {
    this.gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.PAYMENT_MERCHANT_ID,
      publicKey: process.env.PAYMENT_PUBLIC_KEY,
      privateKey: process.env.PAYMENT_PRIVATE_KEY,
    });
  }

  /**
   * Create a new customer
   */
  async getClientToken(): Promise<string> {
    const clientToken = await this.gateway.clientToken.generate({});
    if (clientToken.errors) {
      console.error(clientToken.message);
      throw new BadRequestException(clientToken.message);
    }
    return clientToken.clientToken;
  }

  /**
   * Create a new transaction
   * @param nonce The nonce from the client
   * @param videoId The video id
   * @param toUserId  The user id of the user who is paying
   */
  async createTransaction(
    nonce: string,
    videoId: string,
    toUserId: string,
  ): Promise<TransactionHistory> {
    // find if from user and to user exists
    const toUserPromise = this.userService.findOne(toUserId);
    const videoPromise = this.prismaService.video.findUnique({
      where: {
        id: videoId,
      },
      include: {
        SalesInfo: true,
      },
    });
    const [toUser, video] = await Promise.all([toUserPromise, videoPromise]);

    const amount = `${video.SalesInfo.price}`;
    const fromUser = await this.userService.findOne(video.ownerId);

    if (!toUser) {
      throw new BadRequestException('From user does not exist');
    }

    if (!fromUser) {
      throw new BadRequestException('To user does not exist');
    }

    await this.lockVideoForSale(videoId, toUserId);
    // pre-check if video is ready for sale
    const { reason, can } = await this.transactionService.preCheckTransaction(
      videoId,
      toUserId,
      fromUser.id,
    );

    if (!can) {
      throw new BadRequestException(reason);
    }

    const result = await this.gateway.transaction.sale({
      amount,
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true,
      },
    });

    // if success, create transaction and change the ownership of the video
    if (result.success) {
      const transactionHistory = await this.transactionService.create({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        txHash: result.transaction.id,
        value: result.transaction.amount,
        videoId: videoId,
      });

      await this.prismaService.video.update({
        where: {
          id: videoId,
        },
        data: {
          ownerId: toUser.id,
        },
      });

      await this.rewardUser(amount, fromUser.id, toUserId);
      await this.unlockVideoForSale(videoId);
      return transactionHistory;
    }

    throw new BadRequestException(result.message);
  }

  /**
   * Create a new transaction
   * @param videoId The video id
   * @param toUserId  The user id of the user who is paying
   */
  async createTransactionWithToken(
    videoId: string,
    toUserId: string,
  ): Promise<TransactionHistory> {
    // find if from user and to user exists
    const toUserPromise = this.userService.findOne(toUserId);
    const videoPromise = this.prismaService.video.findUnique({
      where: {
        id: videoId,
      },
      include: {
        SalesInfo: true,
      },
    });
    const [toUser, video] = await Promise.all([toUserPromise, videoPromise]);

    const amount = `${video.SalesInfo.price * 10}`;
    const fromUser = await this.userService.findOne(video.ownerId);

    if (!toUser) {
      throw new BadRequestException('From user does not exist');
    }

    if (!fromUser) {
      throw new BadRequestException('To user does not exist');
    }

    const userBalance = await this.tokenService.getTotalToken(fromUser.id);

    if (userBalance < video.SalesInfo.price * 10) {
      throw new BadRequestException('Not enough token');
    }

    await this.lockVideoForSale(videoId, toUserId);
    // pre-check if video is ready for sale
    const { reason, can } = await this.transactionService.preCheckTransaction(
      videoId,
      toUserId,
      fromUser.id,
    );

    if (!can) {
      throw new BadRequestException(reason);
    }

    // if success, create transaction and change the ownership of the video
    await this.tokenService.useToken(toUserId, amount);
    const transactionHistory = await this.transactionService.create({
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      txHash: new Date().toISOString(),
      value: amount,
      videoId: videoId,
    });

    await this.prismaService.video.update({
      where: {
        id: videoId,
      },
      data: {
        ownerId: toUser.id,
      },
    });
    await this.unlockVideoForSale(videoId);
    return transactionHistory;
  }

  async rewardUser(
    amount: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<any> {
    console.log('rewarding user', amount, fromUserId, toUserId);
    await this.tokenService.rewardToken(toUserId, amount);
  }

  /**
   * Lock video for sale
   * @param videoId
   * @param toUserId Sale to user id
   */
  async lockVideoForSale(videoId: string, toUserId: string) {
    const lockedUntil = dayjs()
      .add(config.videoLockForSaleDuration, 'minutes')
      .toDate();

    try {
      const result = this.prismaService.video.update({
        where: {
          id: videoId,
        },
        data: {
          SalesLockInfo: {
            create: {
              lockedBy: {
                connect: {
                  id: toUserId,
                },
              },
              lockUntil: lockedUntil,
            },
          },
        },
      });
      return result;
    } catch (e) {
      throw new BadRequestException('Video is already locked for sale');
    }
  }

  /**
   * Unlock video for sale
   * @param videoId
   */
  async unlockVideoForSale(videoId: string) {
    return this.prismaService.salesLockInfo.deleteMany({
      where: {
        videoId: videoId,
      },
    });
  }
}
