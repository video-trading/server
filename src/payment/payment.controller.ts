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
import { CheckoutDto } from './dto/checkout.dto';
import { RequestWithUser } from '../common/types';

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
}
