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
import { RequirePermissions } from '../../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../../shared/constants/permissions.constants';
import { PaginationQueryDto } from '../../../../../shared/dto/pagination-query.dto';
import { CreateCouponDto } from '../../application/dto/create-coupon.dto';
import { UpdateCouponDto } from '../../application/dto/update-coupon.dto';
import { CouponsService } from '../../application/services/coupons.service';

@ApiTags('Admin Coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
@UserTypes('STAFF')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.COUPONS_READ)
  @ApiOperation({ summary: 'Listar cupones' })
  list(@Query() query: PaginationQueryDto) {
    return this.couponsService.listCoupons(query);
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.COUPONS_READ)
  @ApiOperation({ summary: 'Resumen de cupones' })
  stats() {
    return this.couponsService.getStats();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.COUPONS_WRITE)
  @ApiOperation({ summary: 'Crear cupón' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.COUPONS_READ)
  @ApiOperation({ summary: 'Detalle de cupón' })
  getOne(@Param('id') id: string) {
    return this.couponsService.getCoupon(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.COUPONS_WRITE)
  @ApiOperation({ summary: 'Actualizar cupón' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.updateCoupon(id, dto);
  }
}
