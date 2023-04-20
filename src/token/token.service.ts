import { Injectable } from '@nestjs/common';
import { TokenHistoryType } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async rewardToken(user: string, value: string) {
    await this.prisma.tokenHistory.create({
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

  async getTransactionHistory(user: string) {
    return await this.prisma.tokenHistory.findMany({
      where: {
        user: {
          id: user,
        },
      },
    });
  }

  async getTotalToken(user: string) {
    const tokenHistory = await this.prisma.tokenHistory.findMany({
      where: {
        user: {
          id: user,
        },
      },
    });
    const totalToken = tokenHistory.reduce((acc, cur) => {
      return acc + Number(cur.value);
    }, 0);
    return totalToken;
  }

  async useToken(user: string, value: string) {
    await this.prisma.tokenHistory.create({
      data: {
        user: {
          connect: {
            id: user,
          },
        },
        value: `-${value}`,
        timestamp: new Date().toISOString(),
        type: TokenHistoryType.USED,
      },
    });
  }
}
