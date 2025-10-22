import { Injectable, Logger, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TokenValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TokenValidationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      this.logger.warn(`Authorization header missing for ${req.method} ${req.originalUrl}`);
      throw new UnauthorizedException('Authorization header missing or invalid.');
    }

    next();
  }
}
