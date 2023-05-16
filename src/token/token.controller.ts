import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { RequestWithUser } from 'src/common/types';
import { TokenService } from './token.service';

interface AddTokenDto {
  tx: string;
  timestamp: number;
  value: string;
}

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  // @RabbitSubscribe({
  //   exchange: 'token-rewarded',
  //   routingKey: 'token-rewarded',
  //   queue: 'token-rewarded',
  // })
  // async addToken(tx: AddTokenDto) {}

  @Get('history/:userId')
  async getTransactionHistory(@Param('userId') userId: string) {
    return await this.tokenService.getTransactionHistory(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('total')
  async getTotalToken(@Req() user: RequestWithUser) {
    return await this.tokenService.getTotalToken(user.user.userId);
  }
}
