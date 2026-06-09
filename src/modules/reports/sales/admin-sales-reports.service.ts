import { Injectable } from '@nestjs/common';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DashboardStatsQueryDto } from '../dashboard/dashboard-stats-query.dto';

type DayRange = { start: Date; end: Date };

@Injectable()
export class AdminSalesReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesReport(query: DashboardStatsQueryDto = {}) {
    const settings = await this.prisma.storeSettings.findFirst();
    const currencyCode = settings?.defaultCurrencyCode ?? 'PEN';
    const range = this.resolveRange(query);

    const [ordersCount, revenueAgg, ordersByStatus, dailyOrders, dailyRevenue] =
      await Promise.all([
        this.prisma.order.count({
          where: {
            createdAt: { gte: range.start, lte: range.end },
            status: { not: OrderStatus.CANCELLED },
          },
        }),
        this.prisma.order.aggregate({
          where: {
            createdAt: { gte: range.start, lte: range.end },
            paymentStatus: OrderPaymentStatus.PAID,
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
          },
          _sum: { total: true, subtotal: true, taxAmount: true, shippingAmount: true, discountAmount: true },
          _avg: { total: true },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: { createdAt: { gte: range.start, lte: range.end } },
          _count: { _all: true },
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

    const dailySeries = this.buildDailySeries(range, dailyOrders, dailyRevenue);

    return {
      currencyCode,
      range: { from: range.start.toISOString(), to: range.end.toISOString() },
      ordersCount,
      revenueTotal: revenueAgg._sum.total?.toString() ?? '0',
      subtotalTotal: revenueAgg._sum.subtotal?.toString() ?? '0',
      taxTotal: revenueAgg._sum.taxAmount?.toString() ?? '0',
      shippingTotal: revenueAgg._sum.shippingAmount?.toString() ?? '0',
      discountTotal: revenueAgg._sum.discountAmount?.toString() ?? '0',
      averageOrderValue: revenueAgg._avg.total?.toString() ?? '0',
      ordersByStatus: ordersByStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      dailySeries,
    };
  }

  async getTopProducts(query: DashboardStatsQueryDto & { limit?: number } = {}) {
    const range = this.resolveRange(query);
    const limit = query.limit ?? 10;

    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName', 'sku'],
      where: {
        order: {
          createdAt: { gte: range.start, lte: range.end },
          paymentStatus: OrderPaymentStatus.PAID,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
      },
      _sum: { quantity: true, lineTotal: true },
    });

    const sorted = [...rows].sort(
      (a, b) => Number(b._sum.lineTotal ?? 0) - Number(a._sum.lineTotal ?? 0),
    );

    return {
      range: { from: range.start.toISOString(), to: range.end.toISOString() },
      items: sorted.slice(0, limit).map((row, index) => ({
        rank: index + 1,
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        quantitySold: row._sum.quantity ?? 0,
        revenue: row._sum.lineTotal?.toString() ?? '0',
      })),
    };
  }

  async exportSalesCsv(query: DashboardStatsQueryDto = {}) {
    const report = await this.getSalesReport(query);
    const headers = ['Fecha', 'Pedidos', 'Ventas'];
    const rows = report.dailySeries.map((day) => [
      day.date,
      String(day.orders),
      day.revenue,
    ]);

    return this.toCsv([headers, ...rows]);
  }

  async exportTopProductsCsv(query: DashboardStatsQueryDto & { limit?: number } = {}) {
    const report = await this.getTopProducts(query);
    const headers = ['Ranking', 'Producto', 'SKU', 'Unidades', 'Ventas'];
    const rows = report.items.map((item) => [
      String(item.rank),
      item.productName,
      item.sku,
      String(item.quantitySold),
      item.revenue,
    ]);

    return this.toCsv([headers, ...rows]);
  }

  private resolveRange(query: DashboardStatsQueryDto): DayRange {
    if (query.dateFrom && query.dateTo) {
      return { start: new Date(query.dateFrom), end: new Date(query.dateTo) };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private buildDailySeries(
    range: DayRange,
    orders: { createdAt: Date }[],
    revenueRows: { createdAt: Date; total: { toString(): string } }[],
  ) {
    const buckets = new Map<string, { orders: number; revenue: number }>();
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= range.end) {
      buckets.set(cursor.toISOString().slice(0, 10), { orders: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket.orders += 1;
    }

    for (const row of revenueRows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket.revenue += Number(row.total);
    }

    return [...buckets.entries()].map(([date, values]) => ({
      date,
      orders: values.orders,
      revenue: values.revenue.toFixed(2),
    }));
  }

  private toCsv(rows: string[][]) {
    return rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }
}
