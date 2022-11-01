import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  config();

  const app = await NestFactory.create(AppModule);
  const docConfig = new DocumentBuilder()
    .setTitle('Video Trading API')
    .setVersion('1.0')
    .addTag('video')
    .addTag('transcoding')
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
