import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Controller } from '@nestjs/common';

interface AddTokenDto {
  tx: string;
  timestamp: number;
  value: string;
}

@Controller('token')
export class TokenController {
  @RabbitSubscribe({
    exchange: 'token-rewarded',
    routingKey: 'token-rewarded',
    queue: 'token-rewarded',
  })
  async addnft(tx: AddTokenDto) {

  }
}
