import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { Environments } from '../common/environment';
import { MessageQueue } from '../common/messageQueue';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { TranscodingController } from './transcoding.controller';
import { TranscodingService } from './transcoding.service';

@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      exchanges: [
        {
          name: MessageQueue.transcodingExchange,
          type: 'topic',
        },
        {
          name: MessageQueue.analyzingExchange,
          type: 'topic',
        },
      ],
      uri: Environments.rabbit_mq_url,
      enableControllerDiscovery: true,
      connectionInitOptions: {
        timeout: 20000,
      },
    }),
  ],
  controllers: [TranscodingController],
  providers: [PrismaService, TranscodingService, StorageService],
})
export class TranscodingModule {}
