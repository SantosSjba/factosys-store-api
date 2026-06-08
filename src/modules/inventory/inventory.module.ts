import { Module } from '@nestjs/common';
import { StockService } from './application/services/stock.service';
import { WarehousesService } from './application/services/warehouses.service';
import { PrismaMovementRepository } from './infrastructure/repositories/prisma-movement.repository';
import { PrismaStockRepository } from './infrastructure/repositories/prisma-stock.repository';
import { PrismaWarehouseRepository } from './infrastructure/repositories/prisma-warehouse.repository';
import { AdminStockController } from './presentation/controllers/admin-stock.controller';
import { AdminWarehousesController } from './presentation/controllers/admin-warehouses.controller';

@Module({
  controllers: [AdminWarehousesController, AdminStockController],
  providers: [
    PrismaWarehouseRepository,
    PrismaStockRepository,
    PrismaMovementRepository,
    WarehousesService,
    StockService,
  ],
  exports: [WarehousesService, StockService],
})
export class InventoryModule {}
