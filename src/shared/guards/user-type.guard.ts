import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPES_KEY } from '../constants/auth.constants';
import { AllowedUserType } from '../decorators/user-types.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedTypes = this.reflector.getAllAndOverride<AllowedUserType[]>(
      USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedTypes?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !allowedTypes.includes(user.userType)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_USER_TYPE',
        message: 'No tienes permiso para acceder a este recurso.',
      });
    }

    return true;
  }
}
