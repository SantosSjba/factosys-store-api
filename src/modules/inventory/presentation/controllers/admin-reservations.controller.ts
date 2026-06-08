import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { ListReservationsQueryDto, CreateStockReservationDto } from '../../application/dto/stock-reservation.dto';
import { ReservationsService } from '../../application/services/reservations.service';

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@Controller('admin/inventory/reservations')
@UserTypes('STAFF')
export class AdminReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Listar reservas de stock' })
  listReservations(@Query() query: ListReservationsQueryDto) {
    return this.reservationsService.listReservations(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Reservar stock' })
  createReservation(
    @Body() dto: CreateStockReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.createReservation(dto, user.id);
  }

  @Post(':id/release')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Liberar reserva de stock' })
  releaseReservation(@Param('id') id: string) {
    return this.reservationsService.releaseReservation(id);
  }
}
