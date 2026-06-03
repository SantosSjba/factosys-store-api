import { Injectable } from '@nestjs/common';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';

@Injectable()
export class RolesService {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  async listStaffRoles() {
    const roles = await this.userRepository.listStaffRoles();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      userType: role.userType,
      isSystem: role.isSystem,
      permissions: role.permissions.map((entry) => ({
        slug: entry.permission.slug,
        name: entry.permission.name,
        module: entry.permission.module,
      })),
    }));
  }
}
