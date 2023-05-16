import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    // RabbitMQModule.forRoot(RabbitMQModule, {
    //   exchanges: [
    //     {
    //       name: 'kongshum-token-rewarded',
    //       type: 'topic',
    //     },
    //     {
    //       name: 'kongshum-token',
    //       type: 'topic',
    //     },
    //     {
    //       name: 'kongshum-nft-rewarded',
    //       type: 'topic',
    //     },
    //     {
    //       name: 'kongshum-nft',
    //       type: 'topic',
    //     },
    //   ],
    //   uri: process.env.RABBITMQ_URL,
    //   enableControllerDiscovery: true,
    //   connectionInitOptions: {
    //     timeout: 20000,
    //   },
    // }),
  ],
  providers: [TokenService, PrismaService],
  controllers: [TokenController],
})
export class TokenModule {}
