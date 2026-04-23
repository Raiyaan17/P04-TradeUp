import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Normalize the error response to always have a string message.
 * This ensures the frontend can reliably display error messages.
 */
function normalizeMessage(response: unknown): string {
  if (typeof response === 'string') {
    return response;
  }

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;

    // Handle Nest validation pipe errors (array of messages)
    if (Array.isArray(obj.message)) {
      return obj.message.join(' • ');
    }

    // Handle standard HttpException response
    if (typeof obj.message === 'string') {
      return obj.message;
    }

    // Handle error property
    if (typeof obj.error === 'string') {
      return obj.error;
    }
  }

  return 'An unexpected error occurred';
}

@Catch()
export class CorsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    console.log('Exception caught in CorsExceptionFilter:', exception);
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);

    // Set CORS headers for all responses, including error responses
    // Allow both development and production origins
    const ALLOWED_ORIGINS = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://p04-trade-up.vercel.app',
      'https://p04-trade-up1.vercel.app',
      'https://tradeup-syai.onrender.com/',
      'http://136.119.205.38/',
    ];
    const requestOrigin = request.headers.origin;

    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
      response.header('Access-Control-Allow-Origin', requestOrigin);
    } else {
      response.header(
        'Access-Control-Allow-Origin',
        'https://p04-trade-up.vercel.app',
      );
    }

    response.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    );
    response.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Requested-With',
    );
    response.header('Access-Control-Allow-Credentials', 'true');

    if (request.method === 'OPTIONS') {
      response.status(204).send();
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get the raw exception response
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Always return a normalized error response with string message
    response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: normalizeMessage(exceptionResponse),
      // Include raw details for debugging (frontend can optionally use this)
      details:
        exceptionResponse !== null && typeof exceptionResponse === 'object'
          ? exceptionResponse
          : undefined,
    });
  }
}
