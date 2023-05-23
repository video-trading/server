import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { RedocModule, RedocOptions } from '@juicyllama/nestjs-redoc';

/**
 * This function will build the API document.
 * You can check the documentation at path /docs.
 * For example: `http://localhost:3000/docs`
 * @returns {DocumentBuilder}
 */
function buildApiDocument() {
  return new DocumentBuilder()
    .setTitle('Video Trading server')
    .setDescription('API for Api Trading server')
    .addBearerAuth(
      // defines the authentication type
      // we have defined the permission role called `admin` in this example,
      // and to use this admin tag, you can include `@ApiBearerAuth('admin')` in your controller
      // and there will be an authentication section shown in the redoc document.
      {
        description: 'Regular user permission',
        type: 'http',
        name: 'user',
      },
      'user',
    )
    .setVersion('1.0')
    .build();
}

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

  // Creates the API document configuration object
  const config = buildApiDocument();
  // Creates the API document using the configuration object
  const document = SwaggerModule.createDocument(app, config);

  // Setups the redoc document
  const redocOptions: RedocOptions = {
    // These options are from the redoc document.
    // More info: https://github.com/Redocly/redoc
    sortPropsAlphabetically: true,
    hideDownloadButton: true,
    hideHostname: false,
  };
  // Defines the path where the redoc document will be available
  await RedocModule.setup('/docs', app, document, redocOptions);

  // get auth token from mondule

  const authService = app.get(AuthService);
  const token = await authService.adminToken();
  console.log('Admin token: ', token);
  await app.listen(3000);
}

bootstrap();
