import { Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../../shared/interfaces/jwt-payload.interface';
import { CartService } from '../../application/services/cart.service';

@ApiTags('Store Cart')
@ApiBearerAuth()
@Controller('store/cart')
@UserTypes('CUSTOMER')
export class StoreCartMergeController {
  constructor(private readonly cartService: CartService) {}

  @Post('merge-guest')
  @ApiOperation({ summary: 'Fusionar carrito de invitado al iniciar sesión' })
  mergeGuestCart(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-guest-cart-token') guestToken?: string,
  ) {
    const token = guestToken?.trim();
    if (!token) {
      return this.cartService.getCart({ kind: 'customer', userId: user.id });
    }

    return this.cartService.mergeGuestCartIntoUser(token, user.id);
  }
}
