import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { getPageAndLimit } from '../common/pagination';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { RequestWithUser } from '../common/types';

@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('by/:id')
  @ApiOkResponse({
    description: 'Get transaction by txId',
  })
  async get(@Param('id') id) {
    return await this.transactionService.get(id);
  }

  @Get('video/:videoId')
  @ApiOkResponse({
    description: 'Get all transactions for a video',
  })
  async getTransactionByVideoId(
    @Param('videoId') videoId: string,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

    return await this.transactionService.findTransactionsByVideoId(
      videoId,
      pageInt,
      limitInt,
    );
  }

  @Get('user/:userId')
  @ApiOkResponse({
    description: 'Get a list of transactions belong to user',
  })
  async getTransactionByUserId(
    @Param('userId') userId: string,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

    return await this.transactionService.findTransactionsByUserId(
      userId,
      pageInt,
      limitInt,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get a list of transactions belong to user',
  })
  async getMyTransactions(
    @Req() req: RequestWithUser,
    @Query('page') page: string | undefined,
    @Query('per') limit: string | undefined,
  ) {
    const { page: pageInt, limit: limitInt } = getPageAndLimit(page, limit);

    return await this.transactionService.findTransactionsByUserId(
      req.user.userId,
      pageInt,
      limitInt,
    );
  }
}
