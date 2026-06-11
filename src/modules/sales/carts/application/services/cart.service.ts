import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
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

  async getCart(userId: string) {
    const cart = await this.cartRepository.getOrCreate(userId);
    return this.presentCart(cart);
  }

  countCartItems(userId: string) {
    return this.cartRepository.countItems(userId);
  }

  async addItem(userId: string, variantId: string, quantity: number) {
    await this.assertVariantAvailable(variantId);

    const cart = await this.cartRepository.getOrCreate(userId);
    const existing = await this.cartRepository.findItem(cart.id, variantId);

    if (existing) {
      const nextQuantity = Math.min(
        existing.quantity + quantity,
        MAX_LINE_QUANTITY,
      );

      if (nextQuantity === existing.quantity) {
        throw new BadRequestException({
          code: 'CART_QUANTITY_LIMIT',
          message: `Máximo ${MAX_LINE_QUANTITY} unidades por producto.`,
        });
      }

      await this.cartRepository.updateItemQuantity(
        cart.id,
        variantId,
        nextQuantity,
      );
    } else {
      await this.cartRepository.createItem(cart.id, variantId, quantity);
    }

    await this.cartRepository.touchCart(cart.id);
    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    variantId: string,
    quantity: number,
  ) {
    const cart = await this.cartRepository.findByUserId(userId);

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
      await this.cartRepository.updateItemQuantity(cart.id, variantId, quantity);
    }

    await this.cartRepository.touchCart(cart.id);
    return this.getCart(userId);
  }

  async removeItem(userId: string, variantId: string) {
    return this.updateItemQuantity(userId, variantId, 0);
  }

  async clearCart(userId: string) {
    const cart = await this.cartRepository.findByUserId(userId);

    if (cart) {
      await this.cartRepository.clearItems(cart.id);
      await this.cartRepository.touchCart(cart.id);
    }

    return this.getCart(userId);
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

  private presentCart(cart: CartWithItems) {
    const items = cart.items.map((item) => this.presentLineItem(item));
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

  private presentLineItem(item: CartItemWithVariant) {
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
      maxQuantity: MAX_LINE_QUANTITY,
    };
  }

  private resolveImageUrl(item: CartItemWithVariant) {
    const variantImage = item.variant.images[0]?.url;
    if (variantImage) return variantImage;

    return item.variant.product.images[0]?.url ?? null;
  }
}
