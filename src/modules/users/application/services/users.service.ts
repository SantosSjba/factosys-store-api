import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus, UserType } from '../../../../generated/prisma/client';
import { ROLE_SLUGS } from '../../../../shared/constants/roles.constants';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { PasswordService } from '../../../auth/application/services/password.service';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { ListStaffUsersQueryDto } from '../dto/list-staff-users-query.dto';
import { UpdateStaffUserDto } from '../dto/update-staff-user.dto';
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

  async createCustomerUser(dto: CreateCustomerDto) {
    const existing = await this.userRepository.findByEmail(dto.email);

    if (existing) {
      if (existing.userType === UserType.STAFF) {
        throw new ConflictException({
          code: 'EMAIL_BELONGS_TO_STAFF',
          message: 'Este correo pertenece a un usuario del panel administrativo.',
        });
      }

      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Ya existe un usuario con este correo electrónico.',
      });
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.userRepository.createCustomerUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });

    return this.mapCustomerResponse(user);
  }

  async listStaffUsers(query: ListStaffUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.userRepository.listStaffUsersPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((user) => this.mapUserResponse(user)),
      total,
    );
  }

  async getStaffUser(userId: string) {
    const user = await this.userRepository.findStaffUserById(userId);

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario staff no encontrado.',
      });
    }

    return this.mapUserResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    return this.mapUserResponse(user);
  }

  async updateStaffUser(
    userId: string,
    dto: UpdateStaffUserDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.userRepository.findStaffUserById(userId);

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario staff no encontrado.',
      });
    }

    if (
      dto.status === UserStatus.SUSPENDED &&
      userId === currentUser.id
    ) {
      throw new BadRequestException({
        code: 'CANNOT_SUSPEND_SELF',
        message: 'No puedes suspender tu propia cuenta.',
      });
    }

    if (dto.roleSlugs) {
      this.assertValidStaffRoles(dto.roleSlugs);
    }

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await this.passwordService.hash(dto.password);
    }

    const updated = await this.userRepository.updateStaffUser(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      status: dto.status,
      passwordHash,
      roleSlugs: dto.roleSlugs,
    });

    if (!updated) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario staff no encontrado.',
      });
    }

    return this.mapUserResponse(updated);
  }

  async softDeleteStaffUser(userId: string, currentUser: AuthenticatedUser) {
    if (userId === currentUser.id) {
      throw new BadRequestException({
        code: 'CANNOT_SUSPEND_SELF',
        message: 'No puedes dar de baja tu propia cuenta.',
      });
    }

    const existing = await this.userRepository.findStaffUserById(userId);

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario staff no encontrado.',
      });
    }

    if (existing.status === UserStatus.SUSPENDED) {
      return this.mapUserResponse(existing);
    }

    const updated = await this.userRepository.suspendStaffUser(userId);

    if (!updated) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Usuario staff no encontrado.',
      });
    }

    return this.mapUserResponse(updated);
  }

  async listCustomerUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.userRepository.listCustomerUsersPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((user) => this.mapCustomerResponse(user)),
      total,
    );
  }

  async getCustomerUser(userId: string) {
    const user = await this.userRepository.findCustomerUserById(userId);

    if (!user) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }

    return this.mapCustomerResponse(user);
  }

  async softDeleteCustomerUser(userId: string) {
    const existing = await this.userRepository.findCustomerUserById(userId);

    if (!existing) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }

    if (existing.status === UserStatus.SUSPENDED) {
      return this.mapCustomerResponse(existing);
    }

    const updated = await this.userRepository.suspendCustomerUser(userId);

    if (!updated) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }

    return this.mapCustomerResponse(updated);
  }

  private assertValidStaffRoles(roleSlugs: string[]) {
    const invalidRoles = roleSlugs.filter((slug) => slug === ROLE_SLUGS.CUSTOMER);

    if (invalidRoles.length > 0) {
      throw new ConflictException({
        code: 'INVALID_STAFF_ROLE',
        message: 'No se puede asignar el rol de cliente a un usuario del panel.',
      });
    }
  }

  private mapCustomerResponse(user: {
    id: string;
    email: string;
    userType: string;
    authProvider: string;
    status: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      authProvider: user.authProvider,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
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
