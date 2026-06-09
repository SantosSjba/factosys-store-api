import { Module } from '@nestjs/common';
import { ReservationsService } from './application/services/reservations.service';
import { StockService } from './application/services/stock.service';
import { WarehousesService } from './application/services/warehouses.service';
import { PrismaMovementRepository } from './infrastructure/repositories/prisma-movement.repository';
import { PrismaReservationRepository } from './infrastructure/repositories/prisma-reservation.repository';
import { PrismaStockRepository } from './infrastructure/repositories/prisma-stock.repository';
import { PrismaWarehouseRepository } from './infrastructure/repositories/prisma-warehouse.repository';
import { AdminReservationsController } from './presentation/controllers/admin-reservations.controller';
import { AdminStockController } from './presentation/controllers/admin-stock.controller';
import { AdminWarehousesController } from './presentation/controllers/admin-warehouses.controller';

@Module({
  controllers: [
    AdminWarehousesController,
    AdminStockController,
    AdminReservationsController,
  ],
  providers: [
    PrismaWarehouseRepository,
    PrismaStockRepository,
    PrismaMovementRepository,
    PrismaReservationRepository,
    WarehousesService,
    StockService,
    ReservationsService,
  ],
  exports: [WarehousesService, StockService, ReservationsService],
})
export class InventoryModule {}
