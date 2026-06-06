import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { CreateStaffUserDto } from '../../application/dto/create-staff-user.dto';
import { ListStaffUsersQueryDto } from '../../application/dto/list-staff-users-query.dto';
import { UpdateStaffUserDto } from '../../application/dto/update-staff-user.dto';
import { UsersService } from '../../application/services/users.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UserTypes('STAFF')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado (panel)' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Listar usuarios del panel administrativo (paginado)' })
  listStaff(@Query() query: ListStaffUsersQueryDto) {
    return this.usersService.listStaffUsers(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Obtener usuario staff por ID' })
  getStaff(@Param('id') id: string) {
    return this.usersService.getStaffUser(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  @ApiOperation({
    summary: 'Registrar usuario del panel (solo interno, sin registro público)',
  })
  createStaff(
    @Body() dto: CreateStaffUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.createStaffUser(dto, currentUser);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @ApiOperation({ summary: 'Actualizar usuario staff' })
  updateStaff(
    @Param('id') id: string,
    @Body() dto: UpdateStaffUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.updateStaffUser(id, dto, currentUser);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @ApiOperation({ summary: 'Dar de baja usuario staff (soft delete — suspende y cierra sesiones)' })
  softDeleteStaff(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.softDeleteStaffUser(id, currentUser);
  }
}
