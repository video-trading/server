import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { RequestWithUser } from 'src/common/types';
import { TokenService } from './token.service';
import { getPageAndLimit } from '../common/pagination';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('token')
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
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Param('per') per: string | undefined,
    @Param('page') page: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, per);
    return await this.tokenService.getTokenHistory(userId, limitInt, pageInt);
  }

  @UseGuards(JwtAuthGuard)
  @Get('total')
  async getTotalToken(@Req() user: RequestWithUser) {
    return await this.tokenService.getTotalToken(user.user.userId);
  }

  @Get('my/history')
  @UseGuards(JwtAuthGuard)
  async getMyTokenHistory(
    @Param('userId') userId: string,
    @Param('per') per: string | undefined,
    @Param('page') page: string | undefined,
    @Req() user: RequestWithUser,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, per);

    return await this.tokenService.getTokenHistory(
      user.user.userId,
      limitInt,
      pageInt,
    );
  }
}
