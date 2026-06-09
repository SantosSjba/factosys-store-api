import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReturnRequestStatus } from '../../../generated/prisma/client';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { CreateReturnRequestDto, UpdateReturnStatusDto } from './return.dto';
import { ReturnsService } from './returns.service';

class ListReturnsQueryDto {
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
  @IsEnum(ReturnRequestStatus)
  status?: ReturnRequestStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('Admin Returns')
@ApiBearerAuth()
@Controller('admin/returns')
@UserTypes('STAFF')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RETURNS_READ)
  @ApiOperation({ summary: 'Listar devoluciones RMA' })
  list(@Query() query: ListReturnsQueryDto) {
    return this.returnsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.RETURNS_READ)
  @ApiOperation({ summary: 'Detalle de devolución' })
  get(@Param('id') id: string) {
    return this.returnsService.getById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.RETURNS_WRITE)
  @ApiOperation({ summary: 'Crear solicitud de devolución' })
  create(
    @Body() dto: CreateReturnRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returnsService.create(dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.RETURNS_WRITE)
  @ApiOperation({ summary: 'Actualizar estado de devolución' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReturnStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returnsService.updateStatus(id, dto, user.id);
  }
}
