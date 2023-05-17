import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  // Create the NestJS application.
  const app = await NestFactory.create(AppModule);

  // Setup global validation pipe
  // this is used to validate all incoming requests
  // like the body, query parameters, route parameters, etc
  // since typescript would not check types at runtime
  // this is a good way to validate all incoming data
  app.useGlobalPipes(new ValidationPipe({}));

  // Enable CORS
  // Cors is a security feature that prevents other websites from
  // making requests to our API
  // However, we need to enable it for our frontend to be able to
  // make requests to our API
  app.enableCors();

  // Setup swagger
  // Swagger is a tool that helps us document our API
  // It also provides a nice UI that we can use to test our API
  const docConfig = new DocumentBuilder()
    .setTitle('Video Trading API')
    .setVersion('1.0')
    .addTag('video')
    .addTag('transcoding')
    .addTag('playlist')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('api', app, document);

  // get auth token from mondule

  const authService = app.get(AuthService);
  const token = await authService.adminToken();
  console.log('Admin token: ', token);
  await app.listen(3000);
}

bootstrap();
