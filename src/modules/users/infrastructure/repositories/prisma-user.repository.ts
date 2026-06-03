import { Injectable } from '@nestjs/common';
import {
  AuthProvider,
  Prisma,
  UserStatus,
  UserType,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserWithAccess } from '../../domain/types/user-with-access.type';

const userWithAccessInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class PrismaUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async findById(id: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async createStaffUser(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    roleSlugs: string[];
    createdById?: string;
  }): Promise<UserWithAccess> {
    const roleIds = await this.resolveRoleIds(data.roleSlugs, UserType.STAFF);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        userType: UserType.STAFF,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        createdById: data.createdById,
        roles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async createCustomerUser(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    status?: UserStatus;
  }): Promise<UserWithAccess> {
    const customerRole = await this.prisma.role.findUnique({
      where: { slug: 'customer' },
    });

    if (!customerRole) {
      throw new Error('Customer role not found. Run database seed.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        userType: UserType.CUSTOMER,
        status: data.status ?? UserStatus.PENDING_VERIFICATION,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roles: {
          create: [{ roleId: customerRole.id }],
        },
      },
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async createGoogleCustomerUser(data: {
    email: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserWithAccess> {
    const customerRole = await this.prisma.role.findUnique({
      where: { slug: 'customer' },
    });

    if (!customerRole) {
      throw new Error('Customer role not found. Run database seed.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        userType: UserType.CUSTOMER,
        authProvider: AuthProvider.GOOGLE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        googleId: data.googleId,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: {
          create: [{ roleId: customerRole.id }],
        },
      },
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async linkGoogleAccount(data: {
    userId: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserWithAccess> {
    const user = await this.prisma.user.update({
      where: { id: data.userId },
      data: {
        googleId: data.googleId,
        authProvider: AuthProvider.GOOGLE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async listStaffUsers(): Promise<UserWithAccess[]> {
    const users = await this.prisma.user.findMany({
      where: { userType: UserType.STAFF },
      include: userWithAccessInclude,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapUser(user));
  }

  async saveRefreshToken(data: {
    userId: string;
    tokenHash: string;
    audience: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data: data,
    });
  }

  async findValidRefreshToken(
    tokenHash: string,
    audience: string,
  ): Promise<{ id: string; userId: string } | null> {
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        audience,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return token ? { id: token.id, userId: token.userId } : null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.emailVerificationToken.create({ data });
  }

  async consumeEmailVerificationToken(
    tokenHash: string,
  ): Promise<{ userId: string } | null> {
    const token = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    return { userId: token.userId };
  }

  private async resolveRoleIds(
    roleSlugs: string[],
    userType: UserType,
  ): Promise<string[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        slug: { in: roleSlugs },
        userType,
      },
    });

    return roles.map((role) => role.id);
  }

  async listStaffRoles() {
    return this.prisma.role.findMany({
      where: { userType: UserType.STAFF },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  private mapUser(
    user: Prisma.UserGetPayload<{ include: typeof userWithAccessInclude }>,
  ): UserWithAccess {
    const roles = user.roles.map((userRole) => ({
      slug: userRole.role.slug,
      name: userRole.role.name,
    }));

    const permissionSet = new Set<string>();

    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissionSet.add(rolePermission.permission.slug);
      }
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      authProvider: user.authProvider,
      status: user.status,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      emailVerifiedAt: user.emailVerifiedAt,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles,
      permissions: [...permissionSet],
    };
  }
}
