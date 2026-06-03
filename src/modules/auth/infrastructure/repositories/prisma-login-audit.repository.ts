import { Injectable } from '@nestjs/common';
import {
  LoginAuthMethod,
  LoginResult,
  UserType,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthAudience } from '../../../../shared/constants/auth.constants';

@Injectable()
export class PrismaLoginAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(data: {
    userId?: string;
    email: string;
    userType?: UserType;
    audience: AuthAudience;
    method: LoginAuthMethod;
    result: LoginResult;
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
  }): Promise<void> {
    await this.prisma.loginAudit.create({
      data: {
        userId: data.userId,
        email: data.email.toLowerCase(),
        userType: data.userType,
        audience: data.audience,
        method: data.method,
        result: data.result,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        failureReason: data.failureReason,
      },
    });
  }

  async listRecent(limit = 50) {
    return this.prisma.loginAudit.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userType: true,
          },
        },
      },
    });
  }
}
