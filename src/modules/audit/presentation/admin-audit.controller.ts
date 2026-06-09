import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import { AdminAuditService } from '../application/admin-audit.service';

class ListAuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('Admin Audit')
@ApiBearerAuth()
@Controller('admin/audit')
@UserTypes('STAFF')
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Listar actividad administrativa' })
  list(@Query() query: ListAuditQueryDto) {
    return this.auditService.list(query);
  }
}
