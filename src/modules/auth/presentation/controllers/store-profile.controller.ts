import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { UsersService } from '../../../users/application/services/users.service';

@ApiTags('Store Profile')
@ApiBearerAuth()
@Controller('store')
@UserTypes('CUSTOMER')
export class StoreProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del cliente autenticado' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }
}
