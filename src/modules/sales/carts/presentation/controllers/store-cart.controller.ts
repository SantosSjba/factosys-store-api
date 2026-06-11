import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../../shared/decorators/public.decorator';
import { StoreActorParam } from '../../../../../shared/decorators/store-actor.decorator';
import { OptionalJwtAuthGuard } from '../../../../../shared/guards/optional-jwt-auth.guard';
import { StoreActorGuard } from '../../../../../shared/guards/store-actor.guard';
import type { StoreActor } from '../../../../../shared/types/store-actor.type';
import { UpdateCartItemDto } from '../../application/dto/update-cart-item.dto';
import { UpsertCartItemDto } from '../../application/dto/upsert-cart-item.dto';
import { CartService } from '../../application/services/cart.service';

@ApiTags('Store Cart')
@ApiBearerAuth()
@Controller('store/cart')
@Public()
@UseGuards(OptionalJwtAuthGuard, StoreActorGuard)
export class StoreCartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener carrito del cliente o invitado' })
  getCart(@StoreActorParam() actor: StoreActor) {
    return this.cartService.getCart(actor);
  }

  @Get('count')
  @ApiOperation({ summary: 'Cantidad total de unidades en el carrito' })
  countCartItems(@StoreActorParam() actor: StoreActor) {
    return this.cartService.countCartItems(actor);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar o incrementar un producto en el carrito' })
  addItem(
    @StoreActorParam() actor: StoreActor,
    @Body() dto: UpsertCartItemDto,
  ) {
    return this.cartService.addItem(actor, dto.variantId, dto.quantity);
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Actualizar cantidad de una línea del carrito' })
  updateItem(
    @StoreActorParam() actor: StoreActor,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(actor, variantId, dto.quantity);
  }

  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Quitar un producto del carrito' })
  removeItem(
    @StoreActorParam() actor: StoreActor,
    @Param('variantId') variantId: string,
  ) {
    return this.cartService.removeItem(actor, variantId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  clearCart(@StoreActorParam() actor: StoreActor) {
    return this.cartService.clearCart(actor);
  }
}
