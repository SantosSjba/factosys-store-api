import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { DashboardStatsQueryDto } from '../dashboard/dashboard-stats-query.dto';
import { AdminSalesReportsService } from './admin-sales-reports.service';
import { SalesReportsQueryDto } from './sales-reports-query.dto';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UserTypes('STAFF')
export class AdminSalesReportsController {
  constructor(private readonly salesReportsService: AdminSalesReportsService) {}

  @Get('sales')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Reporte de ventas por periodo' })
  getSales(@Query() query: DashboardStatsQueryDto) {
    return this.salesReportsService.getSalesReport(query);
  }

  @Get('top-products')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Top productos por ventas' })
  getTopProducts(@Query() query: SalesReportsQueryDto) {
    return this.salesReportsService.getTopProducts(query);
  }

  @Get('sales/export')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Exportar ventas CSV' })
  async exportSales(
    @Query() query: DashboardStatsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.salesReportsService.exportSalesCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="ventas-por-periodo.csv"',
    );
    res.send(`\uFEFF${csv}`);
  }

  @Get('top-products/export')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Exportar top productos CSV' })
  async exportTopProducts(
    @Query() query: SalesReportsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.salesReportsService.exportTopProductsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="top-productos.csv"',
    );
    res.send(`\uFEFF${csv}`);
  }

  @Get('margin')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Reporte de margen' })
  getMargin(@Query() query: DashboardStatsQueryDto) {
    return this.salesReportsService.getMarginReport(query);
  }

  @Get('inventory-valuation')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Inventario valorizado' })
  getInventoryValuation() {
    return this.salesReportsService.getInventoryValuationReport();
  }

  @Get('margin/export')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Exportar margen CSV' })
  async exportMargin(
    @Query() query: DashboardStatsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.salesReportsService.exportMarginCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="margen.csv"');
    res.send(`\uFEFF${csv}`);
  }

  @Get('inventory-valuation/export')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Exportar inventario valorizado CSV' })
  async exportInventory(@Res() res: Response) {
    const csv = await this.salesReportsService.exportInventoryCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="inventario-valorizado.csv"',
    );
    res.send(`\uFEFF${csv}`);
  }
}
