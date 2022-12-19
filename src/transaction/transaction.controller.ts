import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { getPageAndLimit } from '../common/pagination';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

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
}
