import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import type { StoreActor } from '../../../../../shared/types/store-actor.type';
import { PrismaCartRepository } from '../../infrastructure/repositories/prisma-cart.repository';

const MAX_LINE_QUANTITY = 99;

type CartWithItems = NonNullable<
  Awaited<ReturnType<PrismaCartRepository['findByUserId']>>
>;

type CartItemWithVariant = CartWithItems['items'][number];

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: PrismaCartRepository,
    private readonly prisma: PrismaService,
  ) {}

  getCart(actor: StoreActor) {
    return this.getCartForActor(actor);
  }

  async getCartForActor(actor: StoreActor) {
    const cart = await this.getOrCreateCart(actor);
    const warehouseId = await this.resolveWarehouseId();
    return this.presentCart(cart, warehouseId);
  }

  countCartItems(actor: StoreActor) {
    return actor.kind === 'customer'
      ? this.cartRepository.countItemsByUserId(actor.userId)
      : this.cartRepository.countItemsByGuestToken(actor.guestToken);
  }

  async addItem(actor: StoreActor, variantId: string, quantity: number) {
    await this.assertVariantAvailable(variantId);

    const warehouseId = await this.resolveWarehouseId();
    const available = await this.getAvailableQuantity(warehouseId, variantId);
    const cart = await this.getOrCreateCart(actor);
    const existing = await this.cartRepository.findItem(cart.id, variantId);

    if (existing) {
      const nextQuantity = Math.min(
        existing.quantity + quantity,
        MAX_LINE_QUANTITY,
        available,
      );

      if (nextQuantity === existing.quantity) {
        throw new BadRequestException({
          code:
            available <= existing.quantity
              ? 'INSUFFICIENT_AVAILABLE_STOCK'
              : 'CART_QUANTITY_LIMIT',
          message:
            available <= existing.quantity
              ? `Solo hay ${available} unidad${available === 1 ? '' : 'es'} disponibles.`
              : `Máximo ${MAX_LINE_QUANTITY} unidades por producto.`,
        });
      }

      await this.cartRepository.updateItemQuantity(
        cart.id,
        variantId,
        nextQuantity,
      );
    } else {
      if (available <= 0) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_AVAILABLE_STOCK',
          message: 'Este producto no tiene stock disponible.',
        });
      }

      await this.cartRepository.createItem(
        cart.id,
        variantId,
        Math.min(quantity, MAX_LINE_QUANTITY, available),
      );
    }

    await this.cartRepository.touchCart(cart.id);
    return this.getCartForActor(actor);
  }

  async updateItemQuantity(
    actor: StoreActor,
    variantId: string,
    quantity: number,
  ) {
    const cart = await this.findCart(actor);

    if (!cart) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'El producto no está en tu carrito.',
      });
    }

    const existing = await this.cartRepository.findItem(cart.id, variantId);

    if (!existing) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'El producto no está en tu carrito.',
      });
    }

    if (quantity <= 0) {
      await this.cartRepository.deleteItem(cart.id, variantId);
    } else {
      await this.assertVariantAvailable(variantId);
      const warehouseId = await this.resolveWarehouseId();
      const available = await this.getAvailableQuantity(warehouseId, variantId);
      const nextQuantity = Math.min(quantity, MAX_LINE_QUANTITY, available);

      if (nextQuantity <= 0) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_AVAILABLE_STOCK',
          message: 'Este producto no tiene stock disponible.',
        });
      }

      await this.cartRepository.updateItemQuantity(
        cart.id,
        variantId,
        nextQuantity,
      );
    }

    await this.cartRepository.touchCart(cart.id);
    return this.getCartForActor(actor);
  }

  async removeItem(actor: StoreActor, variantId: string) {
    return this.updateItemQuantity(actor, variantId, 0);
  }

  async clearCart(actor: StoreActor) {
    const cart = await this.findCart(actor);

    if (cart) {
      await this.cartRepository.clearItems(cart.id);
      await this.cartRepository.touchCart(cart.id);
    }

    return this.getCartForActor(actor);
  }

  async mergeGuestCartIntoUser(guestToken: string, userId: string) {
    const guestCart = await this.cartRepository.findByGuestToken(guestToken);
    if (!guestCart || guestCart.items.length === 0) {
      return this.getCartForActor({ kind: 'customer', userId });
    }

    for (const item of guestCart.items) {
      try {
        await this.addItem(
          { kind: 'customer', userId },
          item.variantId,
          item.quantity,
        );
      } catch (error) {
        const code =
          error instanceof BadRequestException
            ? (error.getResponse() as { code?: string }).code
            : undefined;

        if (
          code !== 'INSUFFICIENT_AVAILABLE_STOCK' &&
          code !== 'CART_QUANTITY_LIMIT'
        ) {
          throw error;
        }
      }
    }

    await this.cartRepository.deleteCart(guestCart.id);
    return this.getCartForActor({ kind: 'customer', userId });
  }

  private async getOrCreateCart(actor: StoreActor) {
    return actor.kind === 'customer'
      ? this.cartRepository.getOrCreate(actor.userId)
      : this.cartRepository.getOrCreateGuest(actor.guestToken);
  }

  private findCart(actor: StoreActor) {
    return actor.kind === 'customer'
      ? this.cartRepository.findByUserId(actor.userId)
      : this.cartRepository.findByGuestToken(actor.guestToken);
  }

  private async assertVariantAvailable(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        isActive: true,
        product: { status: ProductStatus.ACTIVE },
      },
    });

    if (!variant) {
      throw new NotFoundException({
        code: 'VARIANT_NOT_FOUND',
        message: 'La variante no existe o no está disponible.',
      });
    }
  }

  private async presentCart(cart: CartWithItems, warehouseId: string) {
    const availability = await this.loadAvailability(
      warehouseId,
      cart.items.map((item) => item.variantId),
    );
    const items = cart.items.map((item) =>
      this.presentLineItem(item, availability.get(item.variantId) ?? 0),
    );
    const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id,
      itemCount,
      subtotal,
      currencyCode: 'PEN',
      items,
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  private presentLineItem(
    item: CartItemWithVariant,
    availableQuantity: number,
  ) {
    const unitPrice = Number(item.variant.price);
    const compareAtPrice =
      item.variant.compareAtPrice != null
        ? Number(item.variant.compareAtPrice)
        : null;

    return {
      id: item.id,
      variantId: item.variantId,
      productId: item.variant.productId,
      productSlug: item.variant.product.slug,
      productName: item.variant.product.name,
      variantName: item.variant.name,
      sku: item.variant.sku,
      quantity: item.quantity,
      unitPrice,
      compareAtPrice,
      lineSubtotal: unitPrice * item.quantity,
      imageUrl: this.resolveImageUrl(item),
      availableQuantity,
      maxQuantity: Math.min(MAX_LINE_QUANTITY, availableQuantity),
      hasStockIssue: item.quantity > availableQuantity,
    };
  }

  private async resolveWarehouseId() {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'default' },
      include: { defaultWarehouse: true },
    });

    if (!settings?.defaultWarehouse?.isActive) {
      throw new BadRequestException({
        code: 'WAREHOUSE_NOT_CONFIGURED',
        message: 'La tienda no tiene un almacén activo configurado.',
      });
    }

    return settings.defaultWarehouse.id;
  }

  private async getAvailableQuantity(warehouseId: string, variantId: string) {
    const availability = await this.loadAvailability(warehouseId, [variantId]);
    return availability.get(variantId) ?? 0;
  }

  private async loadAvailability(warehouseId: string, variantIds: string[]) {
    const uniqueIds = [...new Set(variantIds)];
    if (uniqueIds.length === 0) return new Map<string, number>();

    const levels = await this.prisma.stockLevel.findMany({
      where: {
        warehouseId,
        variantId: { in: uniqueIds },
      },
      select: {
        variantId: true,
        quantityOnHand: true,
        quantityReserved: true,
      },
    });

    return new Map(
      uniqueIds.map((variantId) => {
        const level = levels.find((entry) => entry.variantId === variantId);
        const available = level
          ? Math.max(0, level.quantityOnHand - level.quantityReserved)
          : 0;
        return [variantId, available] as const;
      }),
    );
  }

  private resolveImageUrl(item: CartItemWithVariant) {
    const variantImage = item.variant.images[0]?.url;
    if (variantImage) return variantImage;

    return item.variant.product.images[0]?.url ?? null;
  }
}
