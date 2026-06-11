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
import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../../shared/interfaces/jwt-payload.interface';
import { UpdateCartItemDto } from '../../application/dto/update-cart-item.dto';
import { UpsertCartItemDto } from '../../application/dto/upsert-cart-item.dto';
import { CartService } from '../../application/services/cart.service';

@ApiTags('Store Cart')
@ApiBearerAuth()
@Controller('store/cart')
@UserTypes('CUSTOMER')
export class StoreCartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener carrito del cliente' })
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Cantidad total de unidades en el carrito' })
  countCartItems(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.countCartItems(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar o incrementar un producto en el carrito' })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertCartItemDto,
  ) {
    return this.cartService.addItem(user.id, dto.variantId, dto.quantity);
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Actualizar cantidad de una línea del carrito' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(
      user.id,
      variantId,
      dto.quantity,
    );
  }

  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Quitar un producto del carrito' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
  ) {
    return this.cartService.removeItem(user.id, variantId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  clearCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.id);
  }
}
