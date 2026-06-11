import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { StoreActorGuard } from '../../../shared/guards/store-actor.guard';
import { CartService } from './application/services/cart.service';
import { PrismaCartRepository } from './infrastructure/repositories/prisma-cart.repository';
import { StoreCartController } from './presentation/controllers/store-cart.controller';
import { StoreCartMergeController } from './presentation/controllers/store-cart-merge.controller';

@Module({
  controllers: [StoreCartController, StoreCartMergeController],
  providers: [
    PrismaCartRepository,
    CartService,
    OptionalJwtAuthGuard,
    StoreActorGuard,
  ],
  exports: [CartService],
})
export class CartsModule {}
