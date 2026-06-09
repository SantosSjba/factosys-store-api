import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import {
  CreateRoleDto,
  UpdateRoleDto,
} from '../../application/dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../../application/dto/update-role-permissions.dto';
import { RolesService } from '../../application/services/roles.service';

@ApiTags('Admin Roles')
@ApiBearerAuth()
@Controller('admin/roles')
@UserTypes('STAFF')
export class AdminRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({
    summary: 'Listar roles del panel para asignación de usuarios',
  })
  listRoles() {
    return this.rolesService.listStaffRoles();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Crear rol personalizado' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':slug')
  @RequirePermissions(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Actualizar rol personalizado' })
  updateRole(@Param('slug') slug: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(slug, dto);
  }

  @Delete(':slug')
  @RequirePermissions(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Eliminar rol personalizado' })
  deleteRole(@Param('slug') slug: string) {
    return this.rolesService.deleteRole(slug);
  }

  @Patch(':slug/permissions')
  @RequirePermissions(PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Actualizar permisos de un rol staff' })
  updateRolePermissions(
    @Param('slug') slug: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(slug, dto);
  }
}
