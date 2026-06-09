import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import {
  AUTH_AUDIENCE,
  AuthAudience,
} from '../../../../shared/constants/auth.constants';
import { parseJwtDurationToSeconds } from '../../../../shared/helpers/jwt-duration.helper';
import { JwtPayload } from '../../../../shared/interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(
    payload: Omit<JwtPayload, 'aud'> & { aud?: AuthAudience },
  ): string {
    const audience = payload.aud ?? AUTH_AUDIENCE.STORE;

    return this.jwtService.sign(
      { ...payload, aud: audience },
      {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn: parseJwtDurationToSeconds(
          this.configService.get<string>('jwt.expiresIn') ?? '30m',
        ),
      },
    );
  }

  generateTokenPair(
    payload: Omit<JwtPayload, 'aud'>,
    audience: AuthAudience,
  ): TokenPair {
    const accessToken = this.generateAccessToken({ ...payload, aud: audience });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshExpiresAt = this.getRefreshExpirationDate();

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      refreshExpiresAt,
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
    });
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshExpirationDate(): Date {
    const expiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );
    const daysMatch = expiresIn.match(/^(\d+)d$/);

    if (daysMatch) {
      const days = Number(daysMatch[1]);
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}
