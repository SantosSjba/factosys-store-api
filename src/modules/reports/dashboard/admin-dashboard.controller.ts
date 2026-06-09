import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardStatsQueryDto } from './dashboard-stats-query.dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UserTypes('STAFF')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Métricas del panel admin' })
  getStats(@Query() query: DashboardStatsQueryDto) {
    return this.dashboardService.getStats(query);
  }
}
