import { Injectable } from '@nestjs/common';
import { PrismaClient, TokenHistoryType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import * as abi from './abi.json';
import { ethers } from 'ethers';
import { SmartContract } from './dto/smart-contract';
import { getPaginationMetaData } from '../common/pagination';

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  private async getContract(pk?: string) {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
    const signer = new ethers.Wallet(pk ?? process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      abi.abi,
      signer,
    );
    return SmartContract.parse(contract);
  }

  /**
   * Reward user with token
   */
  async rewardToken(user: string, value: string, tx: PrismaClient) {
    const contract = await this.getContract();
    const userToBeRewarded = await tx.user.findUnique({
      where: {
        id: user,
      },
      include: {
        Wallet: true,
      },
    });
    // call smart contract to reward user
    const transaction = await contract.reward(
      userToBeRewarded.Wallet.address,
      parseFloat(value),
    );
    await transaction.wait();

    // create token history
    await tx.tokenHistory.create({
      data: {
        user: {
          connect: {
            id: user,
          },
        },
        value: value,
        timestamp: new Date().toISOString(),
        type: TokenHistoryType.REWARD,
      },
    });
  }

  async getTransactionHistory(user: string, per: number, page: number) {
    const pipeline = [
      {
        $match: {
          userId: {
            $oid: user,
          },
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
    ] as any;
    const tokenHistoryPromise = this.prisma.tokenHistory.aggregateRaw({
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

    const count = this.prisma.video.aggregateRaw({
      pipeline: [...pipeline, { $count: 'total' }],
    });

    const [tokenHistory, totalResult] = await Promise.all([
      tokenHistoryPromise,
      count,
    ]);

    return {
      items: tokenHistory as any,
      metadata: getPaginationMetaData(
        page,
        per,
        (totalResult[0] as any)?.total,
      ),
    };
  }

  async getTotalToken(user: string): Promise<string> {
    const userObj = await this.prisma.user.findUnique({
      where: {
        id: user,
      },
      include: {
        Wallet: true,
      },
    });
    const contract = await this.getContract();
    const totalToken = await contract.balanceOf(userObj.Wallet.address);
    return ethers.utils.formatUnits(totalToken, 'wei');
  }

  async useToken(
    fromUser: string,
    toUser: string,
    value: string,
    tx: PrismaClient,
  ) {
    const spender = await tx.user.findUnique({
      where: {
        id: fromUser,
      },
      include: {
        Wallet: true,
      },
    });

    const receiver = await tx.user.findUnique({
      where: {
        id: toUser,
      },
      include: {
        Wallet: true,
      },
    });

    const contract = await this.getContract(spender.Wallet.privateKey);

    const canPurchase = await contract.canPurchase(
      spender.Wallet.address,
      receiver.Wallet.address,
      parseFloat(value),
    );

    if (!canPurchase) {
      throw new Error('Token purchase precheck failed');
    }

    const transaction = await contract.purchase(
      receiver.Wallet.address,
      parseFloat(value),
    );
    await transaction.wait();
    await tx.tokenHistory.create({
      data: {
        user: {
          connect: {
            id: fromUser,
          },
        },
        value: `-${value}`,
        timestamp: new Date().toISOString(),
        type: TokenHistoryType.USED,
      },
    });
  }
}
