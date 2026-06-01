import { Module } from '@nestjs/common';
import { ExcelReportsModule } from './excel/excel.module';
import { PdfReportsModule } from './pdf/pdf.module';

@Module({
  imports: [ExcelReportsModule, PdfReportsModule],
})
export class ReportsModule {}
