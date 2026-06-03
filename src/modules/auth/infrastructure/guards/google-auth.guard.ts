import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.configService.get<boolean>('google.enabled', false)) {
      throw new BadRequestException({
        code: 'GOOGLE_AUTH_DISABLED',
        message:
          'Inicio de sesión con Google no disponible. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.',
      });
    }

    return super.canActivate(context);
  }
}
