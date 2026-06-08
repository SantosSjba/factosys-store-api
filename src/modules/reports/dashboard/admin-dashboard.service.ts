import { Injectable } from '@nestjs/common';
import {
  OrderPaymentStatus,
  OrderStatus,
  ProductStatus,
  UserType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type DayRange = { start: Date; end: Date };

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const settings = await this.prisma.storeSettings.findFirst();
    const timezone = settings?.timezone ?? 'America/Lima';
    const currencyCode = settings?.defaultCurrencyCode ?? 'PEN';
    const lowStockThreshold = settings?.lowStockGlobalThreshold ?? 5;

    const today = this.getDayRange(timezone, 0);
    const yesterday = this.getDayRange(timezone, -1);

    const [
      ordersToday,
      ordersYesterday,
      revenueTodayAgg,
      pendingPaymentOrders,
      processingOrders,
      productsActive,
      staffUsers,
      lowStockItems,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      this.countOrdersInRange(today),
      this.countOrdersInRange(yesterday),
      this.sumRevenueInRange(today),
      this.prisma.order.count({
        where: {
          paymentStatus: OrderPaymentStatus.PENDING,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
      }),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PENDING_PAYMENT,
              OrderStatus.CONFIRMED,
              OrderStatus.PROCESSING,
              OrderStatus.READY_FOR_PICKUP,
              OrderStatus.SHIPPED,
            ],
          },
        },
      }),
      this.prisma.product.count({
        where: { status: ProductStatus.ACTIVE },
      }),
      this.prisma.user.count({ where: { userType: UserType.STAFF } }),
      this.prisma.stockLevel.count({
        where: {
          quantityOnHand: { lte: lowStockThreshold },
          variant: { product: { status: ProductStatus.ACTIVE } },
        },
      }),
      this.prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: {
          createdAt: { gte: today.start },
        },
      }),
    ]);

    const revenueToday = revenueTodayAgg._sum.total?.toString() ?? '0';
    const ordersTrend = this.calcTrend(ordersToday, ordersYesterday);

    return {
      currencyCode,
      ordersToday,
      ordersYesterday,
      ordersTrendPercent: ordersTrend,
      revenueToday,
      pendingPaymentOrders,
      processingOrders,
      productsActive,
      staffUsers,
      lowStockItems,
      ordersByStatus: ordersByStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryMethod: order.deliveryMethod,
        customerName: this.resolveCustomerName(order),
        customerEmail: order.customer?.email ?? order.guestEmail,
        total: order.total.toString(),
        currencyCode: order.currencyCode,
        itemCount: order._count.items,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  private resolveCustomerName(order: {
    guestFirstName: string | null;
    guestLastName: string | null;
    guestEmail: string | null;
    customer: { firstName: string | null; lastName: string | null; email: string } | null;
  }) {
    const registered = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(' ');
    if (registered) return registered;
    const guest = [order.guestFirstName, order.guestLastName].filter(Boolean).join(' ');
    return guest || order.customer?.email || order.guestEmail;
  }

  private countOrdersInRange(range: DayRange) {
    return this.prisma.order.count({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        status: { not: OrderStatus.CANCELLED },
      },
    });
  }

  private sumRevenueInRange(range: DayRange) {
    return this.prisma.order.aggregate({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        paymentStatus: OrderPaymentStatus.PAID,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
      },
      _sum: { total: true },
    });
  }

  private getDayRange(timezone: string, dayOffset: number): DayRange {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value) + dayOffset;

    const localMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const offsetMs = this.getTimezoneOffsetMs(timezone, localMidnight);
    const start = new Date(localMidnight.getTime() + offsetMs);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
  }

  private getTimezoneOffsetMs(timezone: string, date: Date) {
    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return utc.getTime() - local.getTime();
  }

  private calcTrend(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
