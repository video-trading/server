import { BadRequestException, Injectable } from '@nestjs/common';
import braintree from 'braintree';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import dayjs from 'dayjs';
import { config } from '../common/utils/config/config';
import { TransactionHistory } from '@prisma/client';

@Injectable()
export class PaymentService {
  private gateway: braintree.BraintreeGateway;

  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly prismaService: PrismaService,
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
    return clientToken.clientToken;
  }

  /**
   * Create a new transaction
   * @param nonce The nonce from the client
   * @param amount  The amount to charge
   * @param videoId The video id
   * @param fromUserId  The user id of the user who is paying
   * @param toUserId  The user id of the user who is receiving the payment
   */
  async createTransaction(
    nonce: string,
    amount: string,
    videoId: string,
    fromUserId: string,
  ): Promise<TransactionHistory> {
    // find if from user and to user exists
    const fromUserPromise = this.userService.findOne(fromUserId);
    const videoPromise = this.prismaService.video.findUnique({
      where: {
        id: videoId,
      },
    });
    const [fromUser, video] = await Promise.all([
      fromUserPromise,
      videoPromise,
    ]);

    const toUser = await this.userService.findOne(video.ownerId);

    if (!fromUser) {
      throw new BadRequestException('From user does not exist');
    }

    if (!toUser) {
      throw new BadRequestException('To user does not exist');
    }

    await this.lockVideoForSale(videoId, fromUserId);
    // pre-check if video is ready for sale
    const { reason, can } = await this.transactionService.preCheckTransaction(
      videoId,
      fromUserId,
      toUser.id,
      amount,
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

    if (result.success) {
      const transactionHistory = await this.transactionService.create({
        fromUserId: fromUserId,
        toUserId: toUser.id,
        txHash: result.transaction.id,
        value: result.transaction.amount,
        videoId: videoId,
      });
      await this.rewardUser(amount, fromUserId, toUser.id);
      await this.unlockVideoForSale(videoId);
      return transactionHistory;
    }

    throw new BadRequestException(result.message);
  }

  async rewardUser(
    amount: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<any> {
    console.log('rewardUser', amount, fromUserId, toUserId);
  }

  /**
   * Lock video for sale
   * @param videoId
   * @param fromUserId
   */
  async lockVideoForSale(videoId: string, fromUserId: string) {
    const lockedUntil = dayjs()
      .add(config.videoLockForSaleDuration, 'minutes')
      .toDate();

    return this.prismaService.video.update({
      where: {
        id: videoId,
      },
      data: {
        SalesLockInfo: {
          create: {
            lockedBy: {
              connect: {
                id: fromUserId,
              },
            },
            lockUntil: lockedUntil,
          },
        },
      },
    });
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
