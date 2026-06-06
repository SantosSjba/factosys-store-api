import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesService } from './application/services/roles.service';
import { UsersService } from './application/services/users.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { AdminPermissionsController } from './presentation/controllers/admin-permissions.controller';
import { AdminRolesController } from './presentation/controllers/admin-roles.controller';
import { AdminCustomersController } from './presentation/controllers/admin-customers.controller';
import { AdminUsersController } from './presentation/controllers/admin-users.controller';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [
    AdminUsersController,
    AdminCustomersController,
    AdminRolesController,
    AdminPermissionsController,
  ],
  providers: [PrismaUserRepository, UsersService, RolesService],
  exports: [PrismaUserRepository, UsersService, RolesService],
})
export class UsersModule {}
