import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../../../shared/interfaces/jwt-payload.interface';
import { PrismaUserRepository } from '../../../users/infrastructure/repositories/prisma-user.repository';
import { UserStatus } from '../../../../generated/prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userRepository: PrismaUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'La sesión no es válida. Inicia sesión nuevamente.',
      });
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      roles: user.roles.map((role) => role.slug),
      permissions: user.permissions,
      audience: payload.aud,
    };
  }
}
