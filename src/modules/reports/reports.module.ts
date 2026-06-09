import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExcelReportsModule } from './excel/excel.module';
import { PdfReportsModule } from './pdf/pdf.module';
import { SalesReportsModule } from './sales/sales-reports.module';

@Module({
  imports: [DashboardModule, SalesReportsModule, ExcelReportsModule, PdfReportsModule],
})
export class ReportsModule {}
