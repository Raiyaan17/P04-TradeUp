import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import { CorsExceptionFilter } from './common/cors.exception.filter';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://p04-trade-up.vercel.app',
  'https://p04-trade-up1.vercel.app',
];

/** Custom adapter that injects CORS into Socket.IO's own HTTP server.
 *  app.enableCors() only covers Fastify REST routes — polling WS transports
 *  need CORS configured directly on the Socket.IO ServerOptions. */
class CorsIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Wire Socket.IO to the underlying HTTP server so WS handshakes work with Fastify
  app.useWebSocketAdapter(new IoAdapter(app));

  // Ensure uploads directory exists and serve it as static files
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  // @ts-ignore
  await app.register(fastifyStatic as unknown as Record<string, unknown>, {
    root: uploadsDir,
    prefix: '/uploads/',
  });

  // Register fastify multipart feature (10 MB limit)
  // @ts-ignore
  await app.register(multipart as unknown as Record<string, unknown>, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Set global prefix BEFORE Swagger so it picks up /api correctly
  app.setGlobalPrefix('api');

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

  // (global prefix already set above before Swagger)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new CorsExceptionFilter());
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application listening on port ${port}`);
}
void bootstrap();
