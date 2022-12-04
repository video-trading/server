import { AMQPModule } from '@enriqcg/nestjs-amqp';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { TranscodingModule } from './transcoding/transcoding.module';
import { UserModule } from './user/user.module';
import { VideoModule } from './video/video.module';
import { Environments } from './common/environment';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AMQPModule.forRoot({
      uri: Environments.rabbit_mq_url,
      assertExchanges: [
        {
          name: 'video',
          type: 'topic',
        },
      ],
    }),
    AuthModule,
    VideoModule,
    StorageModule,
    TranscodingModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
