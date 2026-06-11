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
    emailVerifiedAt?: Date | null;
    termsAcceptedAt?: Date | null;
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
        emailVerifiedAt: data.emailVerifiedAt,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        termsAcceptedAt: data.termsAcceptedAt,
        roles: {
          create: [{ roleId: customerRole.id }],
        },
      },
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async setTermsAccepted(userId: string, acceptedAt: Date = new Date()) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { termsAcceptedAt: acceptedAt },
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
        status: UserStatus.PENDING_VERIFICATION,
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
    const existing = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existing) {
      throw new Error('User not found');
    }

    const isAlreadyVerified =
      existing.status === UserStatus.ACTIVE &&
      existing.emailVerifiedAt !== null;

    const user = await this.prisma.user.update({
      where: { id: data.userId },
      data: {
        googleId: data.googleId,
        authProvider: AuthProvider.GOOGLE,
        ...(isAlreadyVerified
          ? {
              status: UserStatus.ACTIVE,
              emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            }
          : {}),
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async findStaffUserById(id: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, userType: UserType.STAFF },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async updateStaffUser(
    id: string,
    data: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      status?: UserStatus;
      passwordHash?: string;
      roleSlugs?: string[];
    },
  ): Promise<UserWithAccess | null> {
    const existing = await this.prisma.user.findFirst({
      where: { id, userType: UserType.STAFF },
    });

    if (!existing) {
      return null;
    }

    const userData: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) userData.firstName = data.firstName;
    if (data.lastName !== undefined) userData.lastName = data.lastName;
    if (data.phone !== undefined) userData.phone = data.phone;
    if (data.status !== undefined) userData.status = data.status;
    if (data.passwordHash !== undefined)
      userData.passwordHash = data.passwordHash;

    if (data.roleSlugs) {
      const roleIds = await this.resolveRoleIds(data.roleSlugs, UserType.STAFF);
      userData.roles = {
        deleteMany: {},
        create: roleIds.map((roleId) => ({ roleId })),
      };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
      include: userWithAccessInclude,
    });

    return this.mapUser(user);
  }

  async suspendStaffUser(id: string): Promise<UserWithAccess | null> {
    const existing = await this.prisma.user.findFirst({
      where: { id, userType: UserType.STAFF },
    });

    if (!existing) {
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.SUSPENDED },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    const user = await this.prisma.user.findFirst({
      where: { id },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async listAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  async findStaffRoleBySlug(slug: string) {
    return this.prisma.role.findFirst({
      where: { slug, userType: UserType.STAFF },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    return role;
  }

  async resolvePermissionIds(slugs: string[]): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { slug: { in: slugs } },
    });

    return permissions.map((permission) => permission.id);
  }

  async listCustomerUsersPaginated(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ items: UserWithAccess[]; total: number }> {
    const where: Prisma.UserWhereInput = { userType: UserType.CUSTOMER };

    const search = options.search?.trim();
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userWithAccessInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => this.mapUser(user)),
      total,
    };
  }

  async findCustomerUserById(id: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, userType: UserType.CUSTOMER },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async updateCustomerUser(
    id: string,
    data: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      status?: UserStatus;
      passwordHash?: string;
      clearEmailVerification?: boolean;
    },
  ): Promise<UserWithAccess | null> {
    const existing = await this.prisma.user.findFirst({
      where: { id, userType: UserType.CUSTOMER },
    });

    if (!existing) {
      return null;
    }

    const userData: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) userData.firstName = data.firstName;
    if (data.lastName !== undefined) userData.lastName = data.lastName;
    if (data.phone !== undefined) userData.phone = data.phone;
    if (data.status !== undefined) userData.status = data.status;
    if (data.passwordHash !== undefined)
      userData.passwordHash = data.passwordHash;

    const shouldClearVerification = data.clearEmailVerification === true;

    if (shouldClearVerification) {
      userData.emailVerifiedAt = null;
    }

    const shouldRevokeSessions =
      (data.status === UserStatus.SUSPENDED &&
        existing.status !== UserStatus.SUSPENDED) ||
      shouldClearVerification;

    if (shouldRevokeSessions) {
      const operations: [
        ReturnType<typeof this.prisma.user.update>,
        ReturnType<typeof this.prisma.refreshToken.updateMany>,
        ...ReturnType<typeof this.prisma.emailVerificationToken.updateMany>[],
      ] = [
        this.prisma.user.update({
          where: { id },
          data: userData,
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ];

      if (shouldClearVerification) {
        operations.push(
          this.prisma.emailVerificationToken.updateMany({
            where: { userId: id, usedAt: null },
            data: { usedAt: new Date() },
          }),
        );
      }

      await this.prisma.$transaction(operations);
    } else {
      await this.prisma.user.update({
        where: { id },
        data: userData,
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async suspendCustomerUser(id: string): Promise<UserWithAccess | null> {
    const existing = await this.prisma.user.findFirst({
      where: { id, userType: UserType.CUSTOMER },
    });

    if (!existing) {
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.SUSPENDED },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    const user = await this.prisma.user.findFirst({
      where: { id },
      include: userWithAccessInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async listStaffUsersPaginated(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ items: UserWithAccess[]; total: number }> {
    const where: Prisma.UserWhereInput = { userType: UserType.STAFF };

    const search = options.search?.trim();
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userWithAccessInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => this.mapUser(user)),
      total,
    };
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

  async replaceEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: data.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      }),
    ]);
  }

  async consumeEmailVerificationCode(
    email: string,
    codeHash: string,
  ): Promise<{ userId: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const token = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        tokenHash: codeHash,
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
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    return { userId: user.id };
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

  async createStaffRole(params: {
    name: string;
    slug: string;
    description: string | null;
    permissionIds: string[];
  }) {
    const role = await this.prisma.role.create({
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description,
        userType: UserType.STAFF,
        isSystem: false,
        permissions: {
          create: params.permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    return role;
  }

  async updateStaffRole(
    roleId: string,
    data: { name?: string; description?: string },
  ) {
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async deleteStaffRole(roleId: string) {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.role.delete({ where: { id: roleId } }),
    ]);
  }

  async countUsersWithRole(roleId: string) {
    return this.prisma.userRole.count({ where: { roleId } });
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
      termsAcceptedAt: user.termsAcceptedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles,
      permissions: [...permissionSet],
    };
  }
}
