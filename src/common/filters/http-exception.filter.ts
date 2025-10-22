import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const { status, body } = this.resolveException(exception);

    this.logger.error(
      `[${request.method}] ${request.url} -> ${status} :: ${body.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      message: body.message,
      error: body.error,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveException(exception: unknown) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message = this.normalizeMessage(response);
      const error = this.normalizeError(response);

      return {
        status,
        body: {
          message,
          error,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        message: 'Internal server error.',
        error: 'InternalServerError',
      },
    };
  }

  private normalizeMessage(response: unknown): string {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const body = response as Record<string, unknown>;

      if (Array.isArray(body.message)) {
        return (body.message as string[]).join('; ');
      }

      if (typeof body.message === 'string') {
        return body.message;
      }
    }

    return 'Unexpected error.';
  }

  private normalizeError(response: unknown): string {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const body = response as Record<string, unknown>;

      if (typeof body.error === 'string') {
        return body.error;
      }
    }

    return 'Error';
  }
}
