import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_SLUGS } from '../../../../shared/constants/roles.constants';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';

@Injectable()
export class RolesService {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  async listStaffRoles() {
    const roles = await this.userRepository.listStaffRoles();

    return roles.map((role) => this.mapRoleResponse(role));
  }

  async listPermissions() {
    const permissions = await this.userRepository.listAllPermissions();

    return permissions.map((permission) => ({
      id: permission.id,
      slug: permission.slug,
      name: permission.name,
      module: permission.module,
      description: permission.description,
    }));
  }

  async updateRolePermissions(slug: string, dto: UpdateRolePermissionsDto) {
    if (slug === ROLE_SLUGS.ADMIN) {
      throw new BadRequestException({
        code: 'ADMIN_ROLE_LOCKED',
        message:
          'El rol administrador tiene todos los permisos del sistema y no se puede modificar.',
      });
    }

    const role = await this.userRepository.findStaffRoleBySlug(slug);

    if (!role) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: 'Rol staff no encontrado.',
      });
    }

    const permissionIds = await this.userRepository.resolvePermissionIds(
      dto.permissionSlugs,
    );

    if (permissionIds.length !== dto.permissionSlugs.length) {
      throw new BadRequestException({
        code: 'INVALID_PERMISSIONS',
        message: 'Uno o más permisos no existen en el catálogo.',
      });
    }

    const updated = await this.userRepository.updateRolePermissions(
      role.id,
      permissionIds,
    );

    if (!updated) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: 'Rol staff no encontrado.',
      });
    }

    return this.mapRoleResponse(updated);
  }

  private mapRoleResponse(role: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    userType: string;
    isSystem: boolean;
    permissions: Array<{
      permission: { slug: string; name: string; module: string };
    }>;
  }) {
    return {
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
    };
  }
}
