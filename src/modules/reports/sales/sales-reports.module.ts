import { Module } from '@nestjs/common';
import { AdminSalesReportsController } from './admin-sales-reports.controller';
import { AdminSalesReportsService } from './admin-sales-reports.service';

@Module({
  controllers: [AdminSalesReportsController],
  providers: [AdminSalesReportsService],
})
export class SalesReportsModule {}
