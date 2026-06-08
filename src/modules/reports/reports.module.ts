import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExcelReportsModule } from './excel/excel.module';
import { PdfReportsModule } from './pdf/pdf.module';

@Module({
  imports: [DashboardModule, ExcelReportsModule, PdfReportsModule],
})
export class ReportsModule {}
