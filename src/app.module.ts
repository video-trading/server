import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlockchainService } from './blockchain/blockchain.service';
import { CategoryModule } from './category/category.module';
import { PaymentModule } from './payment/payment.module';
import { PlaylistModule } from './playlist/playlist.module';
import { StorageModule } from './storage/storage.module';
import { TokenModule } from './token/token.module';
import { TransactionModule } from './transaction/transaction.module';
import { TranscodingModule } from './transcoding/transcoding.module';
import { UserModule } from './user/user.module';
import { VideoModule } from './video/video.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Environments } from './common/environment';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({
      config: {
        url: Environments.redis_url,
      },
    }),
    AuthModule,
    VideoModule,
    StorageModule,
    TranscodingModule,
    UserModule,
    PlaylistModule,
    CategoryModule,
    PaymentModule,
    TransactionModule,
    TokenModule,
  ],
  controllers: [AppController],
  providers: [AppService, BlockchainService],
})
export class AppModule {}
