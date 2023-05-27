import { Injectable } from '@nestjs/common';
import { PrismaClient, TokenHistoryType, User, Wallet } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import * as abi from './abi.json';
import { ethers } from 'ethers';
import { SmartContract, SmartContractSchema } from './dto/smart-contract';
import { getPaginationMetaData } from '../common/pagination';
import { objectIdToId } from '../common/objectIdToId';
import { StorageService } from '../storage/storage.service';
import {
  GetTokenHistoryCountSchema,
  GetTokenHistoryDto,
  GetTokenHistorySchema,
} from './dto/get-token-history.dto';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Get contract object using solidity abi.
   * @param pk Private key of the user. If not specified, it will use the private key specified in the environment
   */
  protected async getContract(pk?: string) {
    // Connect to the RPC url specified in the environment, or localhost if not specified
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
    // Connect to the blockchain with the private key specified in the environment
    const signer = new ethers.Wallet(pk ?? process.env.PRIVATE_KEY!, provider);
    // Connect to the contract with the contract address specified in the environment
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      abi.abi,
      signer,
    );
    // Return the contract object
    return SmartContractSchema.parse(contract);
  }

  /**
   * Reward user with token
   */
  public async rewardToken(
    user: string,
    value: number,
    videoId: string,
    tx: PrismaClient,
  ) {
    const userToBeRewarded = await tx.user.findUnique({
      where: {
        id: user,
      },
      include: {
        Wallet: true,
      },
    });
    // call smart contract to reward user
    const transaction = await this.rewardUser(
      userToBeRewarded.Wallet.address,
      value,
    );
    // await transaction.wait();

    // create token history
    await this.createTokenHistory(user, transaction.hash, value, videoId, tx);
  }

  /**
   * Reward user with token.
   * This function will call smart contract to reward user.
   * @param address User's wallet address
   * @param value Amount of token to be rewarded
   * @returns
   */
  protected async rewardUser(address: string, value: number) {
    const contract = await this.getContract();
    const transaction = await contract.reward(address, value);
    return transaction;
  }

  /**
   * Create token history in database
   * @param user User's id
   * @param txHash Transaction hash. This hash is returned from smart contract
   * @param value Amount of token
   * @param videoId Video's id
   * @param tx PrismaClient
   */
  protected async createTokenHistory(
    user: string,
    txHash: string,
    value: number,
    videoId: string,
    tx: PrismaClient,
  ) {
    await tx.tokenHistory.create({
      data: {
        user: {
          connect: {
            id: user,
          },
        },
        txHash: txHash,
        value: `${value} ${await this.getTokenSymbol()}`,
        timestamp: new Date().toISOString(),
        type: TokenHistoryType.REWARD,
        Video: {
          connect: {
            id: videoId,
          },
        },
      },
    });
  }

  /**
   * Get token history of a user
   * @param user User's id
   * @param per Number of items per page
   * @param page Page number
   */
  public async getTokenHistory(user: string, per: number, page: number) {
    const pipeline = [
      {
        $match: {
          userId: {
            $oid: user,
          },
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
          preserveNullAndEmptyArrays: true,
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

    const count = this.prisma.tokenHistory.aggregateRaw({
      pipeline: [...pipeline, { $count: 'total' }],
    });

    const [tokenHistory, totalResult] = await Promise.all([
      tokenHistoryPromise,
      count,
    ]);

    const verifiedTotalResult = GetTokenHistoryCountSchema.parse(totalResult);

    const itemsPromise = (tokenHistory as unknown as any[])
      .map((item) => objectIdToId(item))
      .map<GetTokenHistoryDto>((item) => GetTokenHistorySchema.parse(item))
      .map(async (item) => ({
        ...item,
        transactions: await Promise.all(
          item.transactions.map(async (tx) => ({
            ...tx,
            Video:
              tx.Video !== undefined
                ? {
                    ...tx.Video,
                    thumbnail: (
                      await this.storage.generatePreSignedUrlForThumbnail({
                        ...tx.Video,
                        id: tx.Video._id,
                      } as any)
                    ).previewUrl,
                  }
                : undefined,
          })),
        ),
      }));
    const items = await Promise.all(itemsPromise);
    return {
      items: items,
      metadata: getPaginationMetaData(
        page,
        per,
        verifiedTotalResult[0]?.total ?? 0,
      ),
    };
  }

  /**
   * Get total token of a user
   * @param user User's id
   * @returns
   */
  public async getTotalToken(user: string): Promise<string> {
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

  /**
   * Spend token to purchase video
   */
  public async useToken(
    fromUser: string,
    toUser: string,
    value: string,
    tx: PrismaClient,
    videoId: string,
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

    return this.purchase(contract, spender, receiver, value, tx, videoId);
  }

  /**
   * Purchase video using [spender]'s token to [receiver]
   * @param contract Smart contract object
   * @param spender User who will spend token
   * @param receiver User who will receive token
   * @param value Amount of token to be spent
   * @param tx PrismaClient
   */
  protected async purchase(
    contract: SmartContract,
    spender: User & { Wallet: Wallet },
    receiver: User & { Wallet: Wallet },
    value: string,
    tx: PrismaClient,
    videoId: string,
  ) {
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
            id: spender.id,
          },
        },
        value: `-${value}`,
        txHash: transaction.hash,
        timestamp: new Date().toISOString(),
        type: TokenHistoryType.USED,
        Video: {
          connect: {
            id: videoId,
          },
        },
      },
    });
    return transaction.hash;
  }

  protected async getTokenSymbol(): Promise<string> {
    const contract = await this.getContract();
    return await contract.symbol();
  }
}
