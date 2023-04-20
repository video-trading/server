import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { ApiOkResponse } from '@nestjs/swagger';
import { CheckoutDto, CheckoutWithTokenDto } from './dto/checkout.dto';
import { RequestWithUser } from '../common/types';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { TokenService } from 'src/token/token.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('client_token')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get client side token for payment',
  })
  async getToken(@Req() req: RequestWithUser) {
    const token = await this.paymentService.getClientToken();
    return { token };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Checkout',
  })
  async checkout(
    @Body() checkoutDto: CheckoutDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.paymentService.createTransaction(
      checkoutDto.nonce,
      checkoutDto.videoId,
      req.user.userId,
    );
  }

  @Post('checkout/with_token')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Checkout',
  })
  async checkoutWithToken(
    @Body() checkoutDto: CheckoutWithTokenDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.paymentService.createTransactionWithToken(
      checkoutDto.videoId,
      req.user.userId,
    );
  }
}
