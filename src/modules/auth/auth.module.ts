import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { isGoogleAuthEnabled } from '../../config/preload-env';
import { parseJwtDurationToSeconds } from '../../shared/helpers/jwt-duration.helper';
import { UsersModule } from '../users/users.module';
import { AuthService } from './application/services/auth.service';
import { PasswordService } from './application/services/password.service';
import { TokenService } from './application/services/token.service';
import { PrismaLoginAuditRepository } from './infrastructure/repositories/prisma-login-audit.repository';
import { GoogleAuthGuard } from './infrastructure/guards/google-auth.guard';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AdminAuthController } from './presentation/controllers/admin-auth.controller';
import { StoreAuthController } from './presentation/controllers/store-auth.controller';
import { StoreGoogleAuthController } from './presentation/controllers/store-google-auth.controller';
import { StoreProfileController } from './presentation/controllers/store-profile.controller';

const googleEnabled = isGoogleAuthEnabled();

const googleControllers = googleEnabled ? [StoreGoogleAuthController] : [];
const googleProviders = googleEnabled
  ? [GoogleStrategy, GoogleAuthGuard]
  : [];

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: parseJwtDurationToSeconds(
            configService.get<string>('jwt.expiresIn') ?? '30m',
          ),
        },
      }),
    }),
  ],
  controllers: [
    AdminAuthController,
    StoreAuthController,
    StoreProfileController,
    ...googleControllers,
  ],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    PrismaLoginAuditRepository,
    ...googleProviders,
  ],
  exports: [AuthService, PasswordService, TokenService],
})
export class AuthModule {}
