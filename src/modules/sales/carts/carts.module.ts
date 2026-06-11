import { Module } from '@nestjs/common';
import { CartService } from './application/services/cart.service';
import { PrismaCartRepository } from './infrastructure/repositories/prisma-cart.repository';
import { StoreCartController } from './presentation/controllers/store-cart.controller';

@Module({
  controllers: [StoreCartController],
  providers: [PrismaCartRepository, CartService],
  exports: [CartService],
})
export class CartsModule {}
