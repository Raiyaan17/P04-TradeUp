import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import { CorsExceptionFilter } from './common/cors.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS to allow both development and production origins
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://p04-trade-up.vercel.app',
      'https://p04-trade-up1.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  console.log('CORS configured for origins:', [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://p04-trade-up.vercel.app',
    'https://p04-trade-up1.vercel.app',
  ]);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new CorsExceptionFilter());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}
void bootstrap();
