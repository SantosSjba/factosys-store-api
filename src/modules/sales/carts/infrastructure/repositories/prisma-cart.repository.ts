import { Injectable } from '@nestjs/common';
import { ProductStatus } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';

const cartItemInclude = {
  variant: {
    include: {
      images: { orderBy: { sortOrder: 'asc' as const } },
      product: {
        include: {
          images: { orderBy: { sortOrder: 'asc' as const } },
        },
      },
    },
  },
} as const;

@Injectable()
export class PrismaCartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: {
            variant: {
              isActive: true,
              product: { status: ProductStatus.ACTIVE },
            },
          },
          include: cartItemInclude,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getOrCreate(userId: string) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    return this.prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: cartItemInclude,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  findItem(cartId: string, variantId: string) {
    return this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId, variantId },
      },
    });
  }

  createItem(cartId: string, variantId: string, quantity: number) {
    return this.prisma.cartItem.create({
      data: { cartId, variantId, quantity },
      include: cartItemInclude,
    });
  }

  updateItemQuantity(cartId: string, variantId: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: {
        cartId_variantId: { cartId, variantId },
      },
      data: { quantity },
      include: cartItemInclude,
    });
  }

  deleteItem(cartId: string, variantId: string) {
    return this.prisma.cartItem.delete({
      where: {
        cartId_variantId: { cartId, variantId },
      },
    });
  }

  clearItems(cartId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async countItems(userId: string) {
    const result = await this.prisma.cartItem.aggregate({
      where: {
        cart: { userId },
        variant: {
          isActive: true,
          product: { status: ProductStatus.ACTIVE },
        },
      },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
  }

  touchCart(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  }
}
