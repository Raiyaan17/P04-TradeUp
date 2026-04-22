import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import { CorsExceptionFilter } from './common/cors.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Ensure uploads directory exists and serve it as static files
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  await app.register(fastifyStatic as any, {
    root: uploadsDir,
    prefix: '/uploads/',
  });

  // Register fastify multipart feature (10 MB limit)
  await app.register(multipart as any, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Configure Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('TradeUp API')
    .setDescription('The TradeUp auto-generated OpenAPI documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

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
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application listening on port ${port}`);
}
void bootstrap();
