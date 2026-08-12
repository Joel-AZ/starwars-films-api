import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

// Turns the database's own error codes into HTTP answers, in one place, with
// the same body shape Nest produces for every other error. Without this a
// duplicate key surfaces as an opaque 500.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.translate(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled Prisma error ${exception.code}`, exception);
    }

    response.status(status).json({
      message,
      error: HTTP_ERROR_NAMES[status] ?? 'Internal Server Error',
      statusCode: status,
    });
  }

  private translate(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${this.targetOf(exception)} already exists.`,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record does not exist.',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'That record is still referenced by another one.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        };
    }
  }

  // P2002 reports the offending column(s) in meta.target.
  private targetOf(exception: Prisma.PrismaClientKnownRequestError): string {
    const target = exception.meta?.target;

    if (Array.isArray(target)) {
      return target.join(', ');
    }

    return typeof target === 'string' ? target : 'value';
  }
}

const HTTP_ERROR_NAMES: Record<number, string> = {
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};
