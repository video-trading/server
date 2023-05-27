import { BadRequestException, Injectable } from '@nestjs/common';
import braintree from 'braintree';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { PrismaClient, TransactionHistory } from '@prisma/client';
import { TokenService } from '../token/token.service';
import {
  GetPaymentInfoDto,
  PaymentMethod,
  PaymentMethodSchema,
} from './dto/get-payment-info.dto';
import { GetVideoDetailDto } from '../video/dto/get-video.dto';
import { VideoService } from '../video/video.service';
import { config } from '../common/utils/config/config';

@Injectable()
export class PaymentService {
  gateway: braintree.BraintreeGateway;

  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
    private readonly videoService: VideoService,
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
    const history = await this.prismaService.$transaction(
      async (tx) => {
        // find if from user and to user exists
        const toUserPromise = this.userService.findOne(toUserId, tx as any);
        const videoPromise = tx.video.findUnique({
          where: {
            id: videoId,
          },
          include: {
            SalesInfo: true,
          },
        });
        const [toUser, video] = await Promise.all([
          toUserPromise,
          videoPromise,
        ]);

        const paymentInfo = await this.getPaymentInfo(
          videoId,
          toUserId,
          'fiat',
        );

        const fromUser = await this.userService.findOne(
          video.ownerId,
          tx as any,
        );

        if (!toUser) {
          throw new BadRequestException('From user does not exist');
        }

        if (!fromUser) {
          throw new BadRequestException('To user does not exist');
        }

        // pre-check if video is ready for sale
        const { reason, can } =
          await this.transactionService.preCheckTransaction(
            videoId,
            toUserId,
            fromUser.id,
          );

        if (!can) {
          throw new BadRequestException(reason);
        }

        const result = await this.gateway.transaction.sale({
          amount: paymentInfo.salesInfo.total.price,
          paymentMethodNonce: nonce,
          options: {
            submitForSettlement: true,
          },
        });

        // if success, create transaction and change the ownership of the video
        if (result.success) {
          const transactionHistory = await this.transactionService.create(
            {
              fromUserId: fromUser.id,
              toUserId: toUser.id,
              txHash: result.transaction.id,
              value: `${paymentInfo.salesInfo.total.price} ${paymentInfo.salesInfo.total.unit}`,
              videoId: videoId,
            },
            tx as any,
          );

          await tx.video.update({
            where: {
              id: videoId,
            },
            data: {
              ownerId: toUser.id,
            },
          });

          return {
            ...transactionHistory,
            priceInNumber: paymentInfo.salesInfo.total.priceInNumber,
          };
        }

        throw new BadRequestException(result.message);
      },
      {
        timeout: 100_000,
      },
    );
    await this.prismaService.$transaction(async () => {
      await this.rewardUser(
        history.priceInNumber,
        history.fromId,
        history.toId,
        videoId,
        this.prismaService as any,
      );
    });
    return history;
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
    return this.prismaService.$transaction(
      async (tx) => {
        // find if from user and to user exists
        const toUserPromise = this.userService.findOne(toUserId, tx as any);
        const videoPromise = tx.video.findUnique({
          where: {
            id: videoId,
          },
          include: {
            SalesInfo: true,
            Owner: true,
          },
        });
        const [toUser, video] = await Promise.all([
          toUserPromise,
          videoPromise,
        ]);

        const tokenPaymentInfo = await this.getPaymentInfo(
          videoId,
          toUserId,
          'token',
        );

        const fromUser = await this.userService.findOne(
          video.ownerId,
          tx as any,
        );

        if (!toUser) {
          throw new BadRequestException('From user does not exist');
        }

        if (!fromUser) {
          throw new BadRequestException('To user does not exist');
        }

        // pre-check if video is ready for sale
        const { reason, can } =
          await this.transactionService.preCheckTransaction(
            videoId,
            toUserId,
            fromUser.id,
          );

        if (!can) {
          throw new BadRequestException(reason);
        }

        // if success, create transaction and change the ownership of the video
        const txHash = await this.tokenService.useToken(
          toUserId,
          video.Owner.id,
          tokenPaymentInfo.salesInfo.total.price,
          tx as any,
          videoId,
        );
        const transactionHistory = await this.transactionService.create({
          fromUserId: fromUser.id,
          toUserId: toUser.id,
          txHash: txHash,
          value: `${tokenPaymentInfo.salesInfo.total.price} ${tokenPaymentInfo.salesInfo.total.unit}`,
          videoId: videoId,
        });

        await tx.video.update({
          where: {
            id: videoId,
          },
          data: {
            ownerId: toUser.id,
          },
        });
        return transactionHistory;
      },
      { timeout: 100000 },
    );
  }

  /**
   * Reward user with token
   * @param amount The amount of token
   * @param fromUserId The user id of the user who is paying
   * @param toUserId The user id of the user who is receiving
   * @param videoId The video id
   * @param tx The transaction object
   */
  async rewardUser(
    amount: number,
    fromUserId: string,
    toUserId: string,
    videoId: string,
    tx: PrismaClient,
  ): Promise<any> {
    const rewardAmount = amount * config.tokenRewardRatio;
    await this.tokenService.rewardToken(
      toUserId,
      rewardAmount,
      videoId,
      tx as any,
    );
  }

  /**
   * Get payment info based on the payment method
   * @param videoId
   * @param userId
   * @param paymentMethodStr
   * @returns Payment info
   */
  public async getPaymentInfo(
    videoId: string,
    userId: string,
    paymentMethodStr: PaymentMethod,
  ): Promise<GetPaymentInfoDto> {
    const paymentMethod = PaymentMethodSchema.parse(paymentMethodStr);
    const video = await this.videoService.findOne(videoId, userId);
    const unit = paymentMethod === 'fiat' ? 'HKD' : 'vxv';

    if (paymentMethod === 'fiat') {
      return this.getFiatPrice(video, unit);
    }

    return this.getFiatPrice(video, unit);
  }

  protected getFiatPrice(
    video: GetVideoDetailDto,
    unit: string,
  ): GetPaymentInfoDto {
    return {
      video: {
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        purchasable: video.purchasable,
        SalesInfo: {
          price: video.SalesInfo.price.toFixed(2),
          unit: unit,
        },
        Category: {
          name: video.Category.name,
        },
        User: {
          name: video.User.name,
        },
      },
      salesInfo: {
        prices: [
          {
            name: 'total',
            price: video.SalesInfo.price.toFixed(2),
            unit: unit,
          },
          {
            name: 'gas-fee',
            price: '0.00',
            unit: unit,
          },
          {
            name: 'platform-commission',
            price: '0.00',
            unit: unit,
          },
        ],
        total: {
          price: video.SalesInfo.price.toFixed(2),
          unit: unit,
          priceInNumber: video.SalesInfo.price,
        },
      },
    };
  }
}
