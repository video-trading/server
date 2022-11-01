import { AMQPModule } from '@enriqcg/nestjs-amqp';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { TranscodingModule } from './transcoding/transcoding.module';
import { UserModule } from './user/user.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AMQPModule.forRoot({
      uri: process.env.RABBITMQ_URI,
      assertExchanges: [
        {
          name: 'video',
          type: 'topic',
        },
      ],
    }),
    VideoModule,
    StorageModule,
    TranscodingModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
