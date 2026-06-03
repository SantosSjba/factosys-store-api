import { ConflictException, Injectable } from '@nestjs/common';
import { ROLE_SLUGS } from '../../../../shared/constants/roles.constants';
import { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { PasswordService } from '../../../auth/application/services/password.service';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async createStaffUser(
    dto: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      roleSlugs: string[];
    },
    createdBy: AuthenticatedUser,
  ) {
    const existing = await this.userRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Ya existe un usuario con este correo electrónico.',
      });
    }

    const invalidRoles = dto.roleSlugs.filter((slug) => slug === ROLE_SLUGS.CUSTOMER);

    if (invalidRoles.length > 0) {
      throw new ConflictException({
        code: 'INVALID_STAFF_ROLE',
        message: 'No se puede asignar el rol de cliente a un usuario del panel.',
      });
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.userRepository.createStaffUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      roleSlugs: dto.roleSlugs,
      createdById: createdBy.id,
    });

    return this.mapUserResponse(user);
  }

  async listStaffUsers() {
    const users = await this.userRepository.listStaffUsers();
    return users.map((user) => this.mapUserResponse(user));
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    return this.mapUserResponse(user);
  }

  private mapUserResponse(user: {
    id: string;
    email: string;
    userType: string;
    status: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    roles: { slug: string; name: string }[];
    permissions: string[];
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.createdAt,
    };
  }
}
