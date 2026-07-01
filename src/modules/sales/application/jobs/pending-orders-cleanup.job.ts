import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OrdersService } from '../services/orders.service';

@Injectable()
export class PendingOrdersCleanupJob {
  private readonly logger = new Logger(PendingOrdersCleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cancelAbandonedGatewayOrders() {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { abandonedGatewayOrderExpiryHours: true },
    });

    const expiryHours = settings?.abandonedGatewayOrderExpiryHours ?? 0;
    if (!expiryHours || expiryHours <= 0) {
      return;
    }

    const result =
      await this.ordersService.cancelExpiredGatewayOrders(expiryHours);

    if (result.cancelled > 0) {
      this.logger.log(
        `Cancelados ${result.cancelled} pedido(s) GATEWAY sin pago (TTL ${expiryHours}h).`,
      );
    }
  }
}
