import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CheckoutDto, CheckoutWithTokenDto } from './dto/checkout.dto';
import { RequestWithUser } from '../common/types';

@ApiTags('payment')
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

  @Get('checkout/:videoId')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get payment info',
  })
  async getPaymentInfoForCheckout(
    @Param('videoId') videoId: string,
    @Req()
    req: RequestWithUser,
  ) {
    return await this.paymentService.getPaymentInfo(
      videoId,
      req.user.userId,
      'fiat',
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

  @Get('checkout/with_token/:videoId')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Get payment info',
  })
  async getPaymentInfoForTokenCheckout(
    @Param('videoId') videoId: string,
    @Req()
    req: RequestWithUser,
  ) {
    return await this.paymentService.getPaymentInfo(
      videoId,
      req.user.userId,
      'token',
    );
  }
}
