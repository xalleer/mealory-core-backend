import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const method = request.method;
    const url = request.originalUrl ?? request.url;

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const durationMs = Date.now() - start;
        this.logger.log(`${method} ${url} -> ${statusCode} (${durationMs}ms)`);
      }),
      catchError((err: unknown) => {
        const statusCode =
          (typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status?: unknown }).status === 'number'
            ? (err as { status: number }).status
            : undefined) ??
          (typeof err === 'object' &&
          err !== null &&
          'statusCode' in err &&
          typeof (err as { statusCode?: unknown }).statusCode === 'number'
            ? (err as { statusCode: number }).statusCode
            : undefined) ??
          response.statusCode;
        const durationMs = Date.now() - start;
        const message =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : String(err);
        const stack =
          typeof err === 'object' && err !== null && 'stack' in err
            ? String((err as { stack?: unknown }).stack)
            : undefined;

        this.logger.error(
          `${method} ${url} -> ${statusCode ?? 'ERROR'} (${durationMs}ms) ${message}`,
          stack,
        );

        return throwError(() => err);
      }),
    );
  }
}
