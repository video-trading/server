import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { TranscodingService } from '../transcoding/transcoding.service';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Environments } from '../common/environment';
import { MessageQueue } from '../common/messageQueue';

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
  controllers: [VideoController],
  providers: [VideoService, PrismaService, StorageService, TranscodingService],
})
export class VideoModule {}
