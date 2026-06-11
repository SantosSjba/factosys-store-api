import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import {
  LoginAuthMethod,
  LoginResult,
  UserStatus,
  UserType,
} from '../../../../generated/prisma/client';
import { MailService } from '../../../../infrastructure/mail/mail.service';
import {
  AUTH_AUDIENCE,
  AuthAudience,
} from '../../../../shared/constants/auth.constants';
import { PrismaLoginAuditRepository } from '../../infrastructure/repositories/prisma-login-audit.repository';
import { GoogleProfilePayload } from '../../domain/types/login-context.type';
import { LoginContext } from '../../domain/types/login-context.type';
import { PrismaUserRepository } from '../../../users/infrastructure/repositories/prisma-user.repository';
import { UserWithAccess } from '../../../users/domain/types/user-with-access.type';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    userType: UserType;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
  };
}

export type GoogleAuthResult =
  | { status: 'authenticated'; tokens: AuthTokensResponse }
  | { status: 'pending_verification'; email: string; message: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly loginAuditRepository: PrismaLoginAuditRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(
    email: string,
    password: string,
    context: LoginContext = {},
  ): Promise<AuthTokensResponse> {
    return this.login(
      email,
      password,
      UserType.STAFF,
      AUTH_AUDIENCE.ADMIN,
      context,
    );
  }

  async storeLogin(
    email: string,
    password: string,
    context: LoginContext = {},
  ): Promise<AuthTokensResponse> {
    return this.login(
      email,
      password,
      UserType.CUSTOMER,
      AUTH_AUDIENCE.STORE,
      context,
    );
  }

  async storeRegister(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    acceptTerms: boolean;
  }): Promise<{ message: string; email: string; verificationCode?: string }> {
    const existing = await this.userRepository.findByEmail(data.email);

    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Ya existe una cuenta con este correo electrónico.',
      });
    }

    const passwordHash = await this.passwordService.hash(data.password);
    const user = await this.userRepository.createCustomerUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      status: UserStatus.PENDING_VERIFICATION,
      termsAcceptedAt: data.acceptTerms ? new Date() : null,
    });

    const { emailSent, verificationCode } =
      await this.issueCustomerVerificationCode(user);

    const isDevelopment =
      this.configService.get<string>('app.env', 'development') ===
      'development';

    return {
      email: user.email,
      message: emailSent
        ? 'Cuenta creada. Revisa tu correo e ingresa el código de verificación.'
        : 'Cuenta creada. No se pudo enviar el correo de verificación; contacta a soporte.',
      ...(isDevelopment && !emailSent ? { verificationCode } : {}),
    };
  }

  async verifyStoreEmail(
    data: {
      token?: string;
      email?: string;
      code?: string;
      acceptTerms?: boolean;
    },
    context: LoginContext = {},
  ): Promise<AuthTokensResponse> {
    let result: { userId: string } | null = null;

    if (data.token) {
      const tokenHash = this.tokenService.hashToken(data.token);
      result =
        await this.userRepository.consumeEmailVerificationToken(tokenHash);
    } else if (data.email && data.code) {
      const codeHash = this.tokenService.hashToken(data.code);
      result = await this.userRepository.consumeEmailVerificationCode(
        data.email,
        codeHash,
      );
    } else {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_PAYLOAD',
        message:
          'Debes enviar el código con tu correo o un token de verificación válido.',
      });
    }

    if (!result) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_CODE',
        message: 'El código de verificación no es válido o ha expirado.',
      });
    }

    let user = await this.userRepository.findById(result.userId);

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    }

    if (!user.termsAcceptedAt) {
      if (!data.acceptTerms) {
        throw new BadRequestException({
          code: 'TERMS_ACCEPTANCE_REQUIRED',
          message: 'Debes aceptar los términos y condiciones para continuar.',
        });
      }

      user = await this.userRepository.setTermsAccepted(user.id);
    }

    return this.issueTokens(
      user,
      AUTH_AUDIENCE.STORE,
      context,
      LoginAuthMethod.LOCAL,
    );
  }

  async resendStoreVerificationEmail(
    email: string,
  ): Promise<{ message: string; verificationCode?: string }> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || user.userType !== UserType.CUSTOMER) {
      return {
        message:
          'Si el correo está registrado y pendiente de verificación, recibirás un nuevo código.',
      };
    }

    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      return {
        message:
          'Si el correo está registrado y pendiente de verificación, recibirás un nuevo código.',
      };
    }

    const { emailSent, verificationCode } =
      await this.issueCustomerVerificationCode(user);

    const isDevelopment =
      this.configService.get<string>('app.env', 'development') ===
      'development';

    return {
      message: emailSent
        ? 'Te enviamos un nuevo código de verificación.'
        : 'No se pudo enviar el correo. Intenta más tarde o contacta a soporte.',
      ...(isDevelopment && !emailSent ? { verificationCode } : {}),
    };
  }

  async handleGoogleLogin(
    profile: GoogleProfilePayload,
    context: LoginContext = {},
  ): Promise<GoogleAuthResult> {
    let user = await this.userRepository.findByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.userRepository.findByEmail(
        profile.email,
      );

      if (existingByEmail) {
        if (existingByEmail.userType !== UserType.CUSTOMER) {
          await this.recordLoginFailure({
            email: profile.email,
            userType: existingByEmail.userType,
            audience: AUTH_AUDIENCE.STORE,
            method: LoginAuthMethod.GOOGLE,
            failureReason: 'GOOGLE_NOT_ALLOWED_FOR_STAFF',
            context,
          });

          throw new ConflictException({
            code: 'GOOGLE_NOT_ALLOWED',
            message:
              'Esta cuenta pertenece al panel administrativo. Usa el inicio de sesión del panel.',
          });
        }

        user = await this.userRepository.linkGoogleAccount({
          userId: existingByEmail.id,
          googleId: profile.googleId,
          firstName:
            profile.firstName ?? existingByEmail.firstName ?? undefined,
          lastName: profile.lastName ?? existingByEmail.lastName ?? undefined,
        });
      } else {
        user = await this.userRepository.createGoogleCustomerUser({
          email: profile.email,
          googleId: profile.googleId,
          firstName: profile.firstName,
          lastName: profile.lastName,
        });
      }
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      const { emailSent } = await this.issueCustomerVerificationCode(user);

      return {
        status: 'pending_verification',
        email: user.email,
        message: emailSent
          ? 'Revisa tu correo e ingresa el código de verificación para activar tu cuenta.'
          : 'No se pudo enviar el correo de verificación. Solicita un nuevo código.',
      };
    }

    this.assertUserCanAuthenticate(user, AUTH_AUDIENCE.STORE);

    return {
      status: 'authenticated',
      tokens: await this.issueTokens(
        user,
        AUTH_AUDIENCE.STORE,
        context,
        LoginAuthMethod.GOOGLE,
      ),
    };
  }

  getGoogleAuthRedirectUrl(): string {
    if (!this.configService.get<boolean>('google.enabled', false)) {
      throw new BadRequestException({
        code: 'GOOGLE_AUTH_DISABLED',
        message: 'El inicio de sesión con Google no está configurado.',
      });
    }

    return '/api/store/auth/google';
  }

  async refreshTokens(
    refreshToken: string,
    audience: AuthAudience,
    context: LoginContext = {},
  ): Promise<AuthTokensResponse> {
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const stored = await this.userRepository.findValidRefreshToken(
      tokenHash,
      audience,
    );

    if (!stored) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'La sesión ha expirado. Inicia sesión nuevamente.',
      });
    }

    await this.userRepository.revokeRefreshToken(tokenHash);

    const user = await this.userRepository.findById(stored.userId);

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    }

    this.assertUserCanAuthenticate(user, audience);

    return this.issueTokens(user, audience, context, LoginAuthMethod.REFRESH);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(refreshToken);
    await this.userRepository.revokeRefreshToken(tokenHash);

    return { message: 'Sesión cerrada correctamente.' };
  }

  async listLoginAudits(limit = 50) {
    const audits = await this.loginAuditRepository.listRecent(limit);

    return audits.map((audit) => ({
      id: audit.id,
      email: audit.email,
      userType: audit.userType,
      audience: audit.audience,
      method: audit.method,
      result: audit.result,
      failureReason: audit.failureReason,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      createdAt: audit.createdAt,
      user: audit.user,
    }));
  }

  private async login(
    email: string,
    password: string,
    expectedUserType: UserType,
    audience: AuthAudience,
    context: LoginContext,
  ): Promise<AuthTokensResponse> {
    const normalizedEmail = email.toLowerCase();

    try {
      const user = await this.userRepository.findByEmail(normalizedEmail);

      if (!user || !user.passwordHash) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos.',
        });
      }

      if (user.userType !== expectedUserType) {
        const isStoreLogin = expectedUserType === UserType.CUSTOMER;
        throw new UnauthorizedException({
          code: 'AUTH_CONTEXT_MISMATCH',
          message: isStoreLogin
            ? 'Esta cuenta es del panel administrativo. Inicia sesión en el admin o usa una cuenta de cliente de la tienda.'
            : 'Esta cuenta es de cliente de la tienda. Usa el inicio de sesión de la tienda (no el panel admin).',
        });
      }

      const passwordValid = await this.passwordService.compare(
        password,
        user.passwordHash,
      );

      if (!passwordValid) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos.',
        });
      }

      this.assertUserCanAuthenticate(user, audience);

      return await this.issueTokens(
        user,
        audience,
        context,
        LoginAuthMethod.LOCAL,
      );
    } catch (error) {
      const failureReason =
        error instanceof UnauthorizedException
          ? ((error.getResponse() as { code?: string }).code ??
            'INVALID_CREDENTIALS')
          : 'UNKNOWN_ERROR';

      await this.recordLoginFailure({
        email: normalizedEmail,
        userType: expectedUserType,
        audience,
        method: LoginAuthMethod.LOCAL,
        failureReason,
        context,
      });

      throw error;
    }
  }

  private assertUserCanAuthenticate(
    user: UserWithAccess,
    audience: AuthAudience,
  ): void {
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Tu cuenta está suspendida. Contacta a soporte.',
      });
    }

    if (
      audience === AUTH_AUDIENCE.STORE &&
      user.userType === UserType.CUSTOMER &&
      user.status === UserStatus.PENDING_VERIFICATION
    ) {
      throw new UnauthorizedException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Debes verificar tu correo electrónico antes de iniciar sesión.',
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_INACTIVE',
        message: 'Tu cuenta no está activa.',
      });
    }
  }

  private async issueTokens(
    user: UserWithAccess,
    audience: AuthAudience,
    context: LoginContext,
    method: LoginAuthMethod,
  ): Promise<AuthTokensResponse> {
    const roleSlugs = user.roles.map((role) => role.slug);
    const tokens = this.tokenService.generateTokenPair(
      {
        sub: user.id,
        email: user.email,
        userType: user.userType,
        roles: roleSlugs,
      },
      audience,
    );

    await this.userRepository.saveRefreshToken({
      userId: user.id,
      tokenHash: tokens.refreshTokenHash,
      audience,
      expiresAt: tokens.refreshExpiresAt,
    });

    await this.loginAuditRepository.record({
      userId: user.id,
      email: user.email,
      userType: user.userType,
      audience,
      method,
      result: LoginResult.SUCCESS,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleSlugs,
      },
    };
  }

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async issueCustomerVerificationCode(user: UserWithAccess): Promise<{
    emailSent: boolean;
    verificationCode: string;
  }> {
    const verificationCode = this.generateVerificationCode();

    await this.userRepository.replaceEmailVerificationToken({
      userId: user.id,
      tokenHash: this.tokenService.hashToken(verificationCode),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const emailSent = await this.mailService.sendVerificationCodeEmail(
      user.email,
      verificationCode,
      user.firstName,
    );

    return { emailSent, verificationCode };
  }

  private async recordLoginFailure(data: {
    email: string;
    userType?: UserType;
    audience: AuthAudience;
    method: LoginAuthMethod;
    failureReason: string;
    context: LoginContext;
  }): Promise<void> {
    await this.loginAuditRepository.record({
      email: data.email,
      userType: data.userType,
      audience: data.audience,
      method: data.method,
      result: LoginResult.FAILED,
      failureReason: data.failureReason,
      ipAddress: data.context.ipAddress,
      userAgent: data.context.userAgent,
    });
  }
}
