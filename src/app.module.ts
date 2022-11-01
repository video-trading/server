import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { VideoModule } from './video/video.module';
import { ConfigModule } from '@nestjs/config';
import { TranscodingModule } from './transcoding/transcoding.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    VideoModule,
    StorageModule,
    TranscodingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
