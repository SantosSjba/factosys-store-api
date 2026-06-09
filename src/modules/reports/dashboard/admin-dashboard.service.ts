import { Injectable } from '@nestjs/common';
import {
  OrderPaymentStatus,
  OrderStatus,
  ProductStatus,
  UserType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DashboardStatsQueryDto } from './dashboard-stats-query.dto';

type DayRange = { start: Date; end: Date };

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(query: DashboardStatsQueryDto = {}) {
    const settings = await this.prisma.storeSettings.findFirst();
    const timezone = settings?.timezone ?? 'America/Lima';
    const currencyCode = settings?.defaultCurrencyCode ?? 'PEN';
    const lowStockThreshold = settings?.lowStockGlobalThreshold ?? 5;

    const range = this.resolveRange(query, timezone);
    const previousRange = this.previousRange(range);

    const [
      ordersInRange,
      ordersPreviousRange,
      revenueInRangeAgg,
      pendingPaymentOrders,
      processingOrders,
      productsActive,
      staffUsers,
      lowStockItems,
      recentOrders,
      ordersByStatus,
      dailyOrders,
      dailyRevenue,
    ] = await Promise.all([
      this.countOrdersInRange(range),
      this.countOrdersInRange(previousRange),
      this.sumRevenueInRange(range),
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
          createdAt: { gte: range.start, lte: range.end },
        },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: range.start, lte: range.end },
          status: { not: OrderStatus.CANCELLED },
        },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: range.start, lte: range.end },
          paymentStatus: OrderPaymentStatus.PAID,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

    const revenueInRange = revenueInRangeAgg._sum.total?.toString() ?? '0';
    const ordersTrend = this.calcTrend(ordersInRange, ordersPreviousRange);
    const dailySeries = this.buildDailySeries(
      range,
      timezone,
      dailyOrders,
      dailyRevenue,
    );

    const today = this.getDayRange(timezone, 0);
    const ordersToday = await this.countOrdersInRange(today);

    return {
      currencyCode,
      range: {
        from: range.start.toISOString(),
        to: range.end.toISOString(),
      },
      ordersInRange,
      ordersPreviousRange,
      ordersTrendPercent: ordersTrend,
      revenueInRange,
      ordersToday,
      pendingPaymentOrders,
      processingOrders,
      productsActive,
      staffUsers,
      lowStockItems,
      dailySeries,
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

  private resolveRange(
    query: DashboardStatsQueryDto,
    timezone: string,
  ): DayRange {
    if (query.dateFrom && query.dateTo) {
      return {
        start: new Date(query.dateFrom),
        end: new Date(query.dateTo),
      };
    }

    if (query.dateFrom) {
      const start = new Date(query.dateFrom);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    const end = this.getDayRange(timezone, 0).end;
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private previousRange(range: DayRange): DayRange {
    const duration = range.end.getTime() - range.start.getTime();
    const end = new Date(range.start.getTime() - 1);
    const start = new Date(end.getTime() - duration);
    return { start, end };
  }

  private buildDailySeries(
    range: DayRange,
    timezone: string,
    orders: { createdAt: Date }[],
    revenueRows: { createdAt: Date; total: { toString(): string } }[],
  ) {
    const buckets = new Map<string, { orders: number; revenue: number }>();
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= range.end) {
      const key = this.formatDateKey(cursor, timezone);
      buckets.set(key, { orders: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const order of orders) {
      const key = this.formatDateKey(order.createdAt, timezone);
      const bucket = buckets.get(key);
      if (bucket) bucket.orders += 1;
    }

    for (const row of revenueRows) {
      const key = this.formatDateKey(row.createdAt, timezone);
      const bucket = buckets.get(key);
      if (bucket) bucket.revenue += Number(row.total);
    }

    return [...buckets.entries()].map(([date, values]) => ({
      date,
      orders: values.orders,
      revenue: values.revenue.toFixed(2),
    }));
  }

  private formatDateKey(date: Date, timezone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private resolveCustomerName(order: {
    guestFirstName: string | null;
    guestLastName: string | null;
    guestEmail: string | null;
    customer: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  }) {
    const registered = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(' ');
    if (registered) return registered;
    const guest = [order.guestFirstName, order.guestLastName]
      .filter(Boolean)
      .join(' ');
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
    const local = new Date(
      date.toLocaleString('en-US', { timeZone: timezone }),
    );
    return utc.getTime() - local.getTime();
  }

  private calcTrend(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
