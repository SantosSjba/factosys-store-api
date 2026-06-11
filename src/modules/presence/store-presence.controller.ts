import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../shared/interfaces/jwt-payload.interface';
import { CustomerPresenceService } from './customer-presence.service';

@ApiTags('Store Presence')
@ApiBearerAuth()
@Controller('store/presence')
@UserTypes('CUSTOMER')
export class StorePresenceController {
  constructor(private readonly presenceService: CustomerPresenceService) {}

  @Post('heartbeat')
  @ApiOperation({
    summary:
      'Registrar actividad del cliente en la tienda (presencia en línea)',
  })
  heartbeat(@CurrentUser() user: AuthenticatedUser) {
    return this.presenceService.heartbeat(user.id);
  }
}
