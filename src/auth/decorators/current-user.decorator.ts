import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator((data: unknown, context: ExecutionContext): JwtPayload => {
  const request = context.switchToHttp().getRequest();
  return request.user as JwtPayload;
});
