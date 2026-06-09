import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '../../../../generated/prisma/client';
import {
  OrderDeliveryMethod,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderSource,
  OrderStatus,
  UserType,
} from '../../../../generated/prisma/client';
import { OrderCreatedEvent } from '../../../../events/order-created.event';
import { OrderPaidEvent } from '../../../../events/order-paid.event';
import { OrderShippedEvent } from '../../../../events/order-shipped.event';
import { CouponsService } from '../../../marketing/coupons/application/services/coupons.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import type {
  CustomerSavedAddressRecord,
  OrderDetailRecord,
  OrderSummaryRecord,
} from '../../domain/types/orders.types';
import { PrismaOrderRepository } from '../../infrastructure/repositories/prisma-order.repository';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import {
  CancelOrderDto,
  RefundOrderDto,
  RefundType,
  UpdateOrderPaymentDto,
  UpdateOrderStatusDto,
} from '../dto/update-order.dto';

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.DELIVERED,
];

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [
    OrderStatus.SHIPPED,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: PrismaOrderRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly couponsService: CouponsService,
  ) {}

  async listOrders(query: ListOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.orderRepository.listPaginated({
      page,
      limit,
      search: query.search,
      status: query.status,
      paymentStatus: query.paymentStatus,
      customerId: query.customerId,
      deliveryMethod: query.deliveryMethod,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapOrderSummary(item)),
      total,
    );
  }

  async exportOrdersCsv(query: ListOrdersQueryDto) {
    const { items } = await this.orderRepository.listPaginated({
      page: 1,
      limit: 5000,
      search: query.search,
      status: query.status,
      paymentStatus: query.paymentStatus,
      customerId: query.customerId,
      deliveryMethod: query.deliveryMethod,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    const headers = [
      'Pedido',
      'Estado',
      'Pago',
      'Entrega',
      'Cliente',
      'Correo',
      'Total',
      'Moneda',
      'Items',
      'Fecha',
    ];

    const rows = items.map((order) => {
      const summary = this.mapOrderSummary(order);
      return [
        summary.orderNumber,
        summary.status,
        summary.paymentStatus,
        summary.deliveryMethod,
        summary.customerName ?? '',
        summary.customerEmail ?? '',
        summary.total,
        summary.currencyCode,
        String(summary.itemCount),
        summary.createdAt.toISOString(),
      ];
    });

    return [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }

  async listCustomerAddresses(customerId: string) {
    const customer = await this.prisma.user.findFirst({
      where: { id: customerId, userType: UserType.CUSTOMER },
    });

    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }

    const rows =
      await this.orderRepository.findAddressesByCustomerId(customerId);
    const seen = new Set<string>();
    const addresses: CustomerSavedAddressRecord[] = [];

    for (const row of rows) {
      const key = this.buildAddressDedupKey(row);
      if (seen.has(key)) continue;
      seen.add(key);

      addresses.push({
        id: row.id,
        type: row.type,
        label: row.label,
        firstName: row.firstName,
        lastName: row.lastName,
        company: row.company,
        phone: row.phone,
        email: row.email,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        city: row.city,
        district: row.district,
        province: row.province,
        department: row.department,
        country: row.country,
        postalCode: row.postalCode,
        lastOrderNumber: row.order.orderNumber,
        lastUsedAt: row.order.createdAt,
      });
    }

    return addresses;
  }

  async getOrder(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado.',
      });
    }

    return this.mapOrderDetail(order);
  }

  async createOrder(dto: CreateOrderDto, staffUserId?: string) {
    const context = await this.resolveStoreContext(dto.warehouseId);
    await this.validateCustomer(dto);

    const variants = await this.loadVariants(
      dto.items.map((item) => item.variantId),
    );
    const lines = this.buildOrderLines(
      dto.items,
      variants,
      context.taxRatePercent,
      context.pricesIncludeTax,
    );

    const subtotal = this.sumDecimals(lines.map((line) => line.lineSubtotal));
    const taxAmount = this.sumDecimals(lines.map((line) => line.taxAmount));
    const deliveryMethod = dto.deliveryMethod ?? OrderDeliveryMethod.SHIPPING;
    const shippingAmount =
      deliveryMethod === OrderDeliveryMethod.PICKUP
        ? 0
        : (dto.shippingAmount ?? 0);
    let discountAmount = dto.discountAmount ?? 0;
    let couponId: string | undefined;

    if (dto.couponCode?.trim()) {
      const resolved = await this.couponsService.resolveDiscount(
        dto.couponCode.trim(),
        subtotal,
      );
      discountAmount = resolved.discountAmount;
      couponId = resolved.couponId;
    }

    const total = subtotal + taxAmount + shippingAmount - discountAmount;

    if (context.minOrderAmount != null && total < context.minOrderAmount) {
      throw new BadRequestException({
        code: 'MIN_ORDER_AMOUNT_NOT_MET',
        message: `El monto mínimo de pedido es ${context.minOrderAmount.toFixed(2)} ${context.currencyCode}.`,
      });
    }

    const paymentStatus = dto.paymentStatus ?? OrderPaymentStatus.PENDING;
    const initialStatus = this.resolveInitialStatus(paymentStatus);

    const order = await this.orderRepository.runTransaction(async (tx) => {
      const numbering = await this.orderRepository.incrementOrderNumber(tx);
      const orderNumber = `${numbering.orderNumberPrefix}${String(numbering.lastOrderNumber).padStart(6, '0')}`;

      const created = await this.orderRepository.createInTransaction(tx, {
        orderNumber,
        status: initialStatus,
        paymentStatus,
        fulfillmentStatus: OrderFulfillmentStatus.UNFULFILLED,
        source: dto.source ?? OrderSource.ADMIN,
        deliveryMethod,
        customer: dto.customerId
          ? { connect: { id: dto.customerId } }
          : undefined,
        guestEmail: dto.guestEmail?.trim() ?? null,
        guestFirstName: dto.guestFirstName?.trim() ?? null,
        guestLastName: dto.guestLastName?.trim() ?? null,
        guestPhone: dto.guestPhone?.trim() ?? null,
        warehouse: { connect: { id: context.warehouseId } },
        currencyCode: context.currencyCode,
        subtotal,
        taxAmount,
        shippingAmount,
        discountAmount,
        total,
        taxRateId: context.taxRateId,
        taxRateName: context.taxRateName,
        taxRatePercent: context.taxRatePercent,
        pricesIncludeTax: context.pricesIncludeTax,
        internalNotes: dto.internalNotes?.trim() ?? null,
        customerNotes: dto.customerNotes?.trim() ?? null,
        confirmedAt:
          initialStatus === OrderStatus.CONFIRMED ? new Date() : null,
        paidAt: paymentStatus === OrderPaymentStatus.PAID ? new Date() : null,
        createdBy: staffUserId ? { connect: { id: staffUserId } } : undefined,
        items: {
          create: lines.map((line, index) => ({
            variantId: line.variantId,
            productId: line.productId,
            sku: line.sku,
            productName: line.productName,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            compareAtPrice: line.compareAtPrice,
            taxAmount: line.taxAmount,
            lineSubtotal: line.lineSubtotal,
            lineTotal: line.lineTotal,
            sortOrder: index,
          })),
        },
        addresses:
          deliveryMethod === OrderDeliveryMethod.SHIPPING &&
          dto.addresses?.length
            ? {
                create: dto.addresses.map((address) => ({
                  type: address.type,
                  label: address.label?.trim() ?? null,
                  firstName: address.firstName?.trim() ?? null,
                  lastName: address.lastName?.trim() ?? null,
                  company: address.company?.trim() ?? null,
                  phone: address.phone?.trim() ?? null,
                  email: address.email?.trim() ?? null,
                  addressLine1: address.addressLine1.trim(),
                  addressLine2: address.addressLine2?.trim() ?? null,
                  city: address.city?.trim() ?? null,
                  district: address.district?.trim() ?? null,
                  province: address.province?.trim() ?? null,
                  department: address.department?.trim() ?? null,
                  country: address.country?.trim().toUpperCase() ?? 'PE',
                  postalCode: address.postalCode?.trim() ?? null,
                })),
              }
            : undefined,
        statusHistory: {
          create: {
            toStatus: initialStatus,
            toPaymentStatus: paymentStatus,
            note: 'Pedido creado desde admin.',
            performedById: staffUserId ?? null,
          },
        },
      });

      if (initialStatus === OrderStatus.CONFIRMED) {
        await this.reserveStockForOrder(tx, created, staffUserId);
      }

      return created;
    });

    if (couponId) {
      await this.couponsService.consumeCoupon(couponId);
    }

    this.eventEmitter.emit('order.created', new OrderCreatedEvent(order.id));
    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      this.eventEmitter.emit('order.paid', new OrderPaidEvent(order.id));
    }

    return this.mapOrderDetail(order);
  }

  async updateOrderStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    staffUserId?: string,
  ) {
    const existing = await this.requireOrder(id);

    if (dto.status === OrderStatus.REFUNDED) {
      throw new BadRequestException({
        code: 'USE_REFUND_ENDPOINT',
        message: 'Usa el endpoint de reembolso para registrar devoluciones.',
      });
    }

    this.assertStatusTransition(existing.status, dto.status);

    const order = await this.orderRepository.runTransaction(async (tx) => {
      const timestamps = this.resolveStatusTimestamps(existing, dto.status);
      const updated = await this.orderRepository.updateInTransaction(tx, id, {
        status: dto.status,
        fulfillmentStatus: this.resolveFulfillmentStatus(dto.status),
        updatedBy: staffUserId ? { connect: { id: staffUserId } } : undefined,
        ...timestamps,
        cancelReason:
          dto.status === OrderStatus.CANCELLED
            ? (dto.note?.trim() ?? existing.cancelReason)
            : existing.cancelReason,
      });

      await this.orderRepository.createStatusHistoryInTransaction(tx, {
        orderId: id,
        fromStatus: existing.status,
        toStatus: dto.status,
        fromPaymentStatus: existing.paymentStatus,
        toPaymentStatus: existing.paymentStatus,
        note: dto.note?.trim() ?? null,
        performedById: staffUserId ?? null,
      });

      if (
        dto.status === OrderStatus.CONFIRMED &&
        existing.status === OrderStatus.PENDING_PAYMENT
      ) {
        await this.reserveStockForOrder(tx, updated, staffUserId);
      }

      if (dto.status === OrderStatus.SHIPPED) {
        await this.fulfillStockForOrder(tx, updated, staffUserId);
      }

      if (
        dto.status === OrderStatus.DELIVERED &&
        updated.deliveryMethod === OrderDeliveryMethod.PICKUP &&
        !existing.shippedAt
      ) {
        await this.fulfillStockForOrder(tx, updated, staffUserId);
      }

      if (dto.status === OrderStatus.CANCELLED) {
        await this.releaseStockForOrder(tx, id);
      }

      return updated;
    });

    if (
      dto.status === OrderStatus.SHIPPED &&
      existing.status !== OrderStatus.SHIPPED
    ) {
      this.eventEmitter.emit('order.shipped', new OrderShippedEvent(order.id));
    }

    return this.mapOrderDetail(order);
  }

  async updateOrderPayment(
    id: string,
    dto: UpdateOrderPaymentDto,
    staffUserId?: string,
  ) {
    const existing = await this.requireOrder(id);

    if (
      dto.paymentStatus === OrderPaymentStatus.REFUNDED ||
      dto.paymentStatus === OrderPaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException({
        code: 'USE_REFUND_ENDPOINT',
        message: 'Usa el endpoint de reembolso para registrar devoluciones.',
      });
    }

    const order = await this.orderRepository.runTransaction(async (tx) => {
      const nextStatus =
        dto.paymentStatus === OrderPaymentStatus.PAID &&
        existing.status === OrderStatus.PENDING_PAYMENT
          ? OrderStatus.CONFIRMED
          : existing.status;

      const updated = await this.orderRepository.updateInTransaction(tx, id, {
        paymentStatus: dto.paymentStatus,
        status: nextStatus,
        paidAt:
          dto.paymentStatus === OrderPaymentStatus.PAID
            ? (existing.paidAt ?? new Date())
            : existing.paidAt,
        confirmedAt:
          nextStatus === OrderStatus.CONFIRMED
            ? (existing.confirmedAt ?? new Date())
            : existing.confirmedAt,
        updatedBy: staffUserId ? { connect: { id: staffUserId } } : undefined,
      });

      await this.orderRepository.createStatusHistoryInTransaction(tx, {
        orderId: id,
        fromStatus: existing.status,
        toStatus: nextStatus,
        fromPaymentStatus: existing.paymentStatus,
        toPaymentStatus: dto.paymentStatus,
        note: dto.note?.trim() ?? null,
        performedById: staffUserId ?? null,
      });

      if (
        nextStatus === OrderStatus.CONFIRMED &&
        existing.status === OrderStatus.PENDING_PAYMENT
      ) {
        await this.reserveStockForOrder(tx, updated, staffUserId);
      }

      return updated;
    });

    if (
      dto.paymentStatus === OrderPaymentStatus.PAID &&
      existing.paymentStatus !== OrderPaymentStatus.PAID
    ) {
      this.eventEmitter.emit('order.paid', new OrderPaidEvent(order.id));
    }

    return this.mapOrderDetail(order);
  }

  async cancelOrder(id: string, dto: CancelOrderDto, staffUserId?: string) {
    const existing = await this.requireOrder(id);
    this.assertStatusTransition(existing.status, OrderStatus.CANCELLED);
    const reason = dto.reason?.trim() || 'Pedido cancelado.';

    const order = await this.orderRepository.runTransaction(async (tx) => {
      const now = new Date();
      const updated = await this.orderRepository.updateInTransaction(tx, id, {
        status: OrderStatus.CANCELLED,
        fulfillmentStatus: OrderFulfillmentStatus.UNFULFILLED,
        cancelledAt: existing.cancelledAt ?? now,
        cancelReason: reason,
        updatedBy: staffUserId ? { connect: { id: staffUserId } } : undefined,
      });

      await this.orderRepository.createStatusHistoryInTransaction(tx, {
        orderId: id,
        fromStatus: existing.status,
        toStatus: OrderStatus.CANCELLED,
        fromPaymentStatus: existing.paymentStatus,
        toPaymentStatus: existing.paymentStatus,
        note: reason,
        performedById: staffUserId ?? null,
      });

      await this.releaseStockForOrder(tx, id);
      return updated;
    });

    return this.mapOrderDetail(order);
  }

  async refundOrder(id: string, dto: RefundOrderDto, staffUserId?: string) {
    const existing = await this.requireOrder(id);
    this.assertRefundable(existing, dto);

    const orderTotal = Number(existing.total);
    const refundAmount =
      dto.type === RefundType.FULL ? orderTotal : (dto.amount as number);
    const shouldRestock =
      dto.restockItems ??
      (dto.type === RefundType.FULL &&
        existing.fulfillmentStatus === OrderFulfillmentStatus.FULFILLED);
    const historyNote = this.buildRefundNote(
      dto,
      refundAmount,
      existing.currencyCode,
    );

    const order = await this.orderRepository.runTransaction(async (tx) => {
      const isFullRefund = dto.type === RefundType.FULL;
      const nextStatus = isFullRefund ? OrderStatus.REFUNDED : existing.status;
      const nextPaymentStatus = isFullRefund
        ? OrderPaymentStatus.REFUNDED
        : OrderPaymentStatus.PARTIALLY_REFUNDED;
      const nextFulfillmentStatus = isFullRefund
        ? OrderFulfillmentStatus.UNFULFILLED
        : existing.fulfillmentStatus;

      const updated = await this.orderRepository.updateInTransaction(tx, id, {
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
        fulfillmentStatus: nextFulfillmentStatus,
        updatedBy: staffUserId ? { connect: { id: staffUserId } } : undefined,
      });

      await this.orderRepository.createStatusHistoryInTransaction(tx, {
        orderId: id,
        fromStatus: existing.status,
        toStatus: nextStatus,
        fromPaymentStatus: existing.paymentStatus,
        toPaymentStatus: nextPaymentStatus,
        note: historyNote,
        performedById: staffUserId ?? null,
      });

      if (shouldRestock && this.wasStockFulfilled(existing)) {
        await this.restockForOrder(tx, updated, staffUserId);
      }

      return updated;
    });

    return this.mapOrderDetail(order);
  }

  private async requireOrder(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado.',
      });
    }
    return order;
  }

  private assertStatusTransition(current: OrderStatus, next: OrderStatus) {
    if (TERMINAL_STATUSES.includes(current)) {
      throw new BadRequestException({
        code: 'ORDER_STATUS_FINAL',
        message: 'El pedido ya está en un estado final.',
      });
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException({
        code: 'INVALID_ORDER_STATUS_TRANSITION',
        message: `No se puede cambiar de ${current} a ${next}.`,
      });
    }
  }

  private resolveInitialStatus(paymentStatus: OrderPaymentStatus) {
    return paymentStatus === OrderPaymentStatus.PAID
      ? OrderStatus.CONFIRMED
      : OrderStatus.PENDING_PAYMENT;
  }

  private assertRefundable(
    order: {
      status: OrderStatus;
      paymentStatus: OrderPaymentStatus;
      total: { toString(): string };
      currencyCode: string;
    },
    dto: RefundOrderDto,
  ) {
    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException({
        code: 'ORDER_ALREADY_REFUNDED',
        message: 'El pedido ya fue reembolsado por completo.',
      });
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException({
        code: 'ORDER_NOT_REFUNDABLE',
        message: 'Solo se pueden reembolsar pedidos entregados.',
      });
    }

    if (
      order.paymentStatus !== OrderPaymentStatus.PAID &&
      order.paymentStatus !== OrderPaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException({
        code: 'ORDER_PAYMENT_NOT_REFUNDABLE',
        message: 'El pago del pedido no admite reembolso.',
      });
    }

    const orderTotal = Number(order.total);

    if (dto.type === RefundType.PARTIAL) {
      if (dto.amount == null) {
        throw new BadRequestException({
          code: 'REFUND_AMOUNT_REQUIRED',
          message: 'Indica el monto del reembolso parcial.',
        });
      }

      if (dto.amount <= 0 || dto.amount > orderTotal) {
        throw new BadRequestException({
          code: 'INVALID_REFUND_AMOUNT',
          message: `El monto debe ser mayor a 0 y no superar ${orderTotal.toFixed(2)} ${order.currencyCode}.`,
        });
      }
    }
  }

  private buildRefundNote(
    dto: RefundOrderDto,
    amount: number,
    currencyCode: string,
  ) {
    const formattedAmount = `${amount.toFixed(2)} ${currencyCode}`;
    const base =
      dto.type === RefundType.FULL
        ? `Reembolso total (${formattedAmount})`
        : `Reembolso parcial (${formattedAmount})`;

    return dto.note?.trim() ? `${base}. ${dto.note.trim()}` : base;
  }

  private wasStockFulfilled(order: {
    fulfillmentStatus: OrderFulfillmentStatus;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  }) {
    return (
      order.fulfillmentStatus === OrderFulfillmentStatus.FULFILLED ||
      order.shippedAt != null ||
      order.deliveredAt != null
    );
  }

  private resolveFulfillmentStatus(
    status: OrderStatus,
  ): OrderFulfillmentStatus {
    if (status === OrderStatus.DELIVERED)
      return OrderFulfillmentStatus.FULFILLED;
    if (
      status === OrderStatus.SHIPPED ||
      status === OrderStatus.READY_FOR_PICKUP
    ) {
      return OrderFulfillmentStatus.PARTIAL;
    }
    return OrderFulfillmentStatus.UNFULFILLED;
  }

  private resolveStatusTimestamps(
    existing: {
      confirmedAt: Date | null;
      shippedAt: Date | null;
      deliveredAt: Date | null;
      cancelledAt: Date | null;
    },
    status: OrderStatus,
  ) {
    const now = new Date();
    return {
      confirmedAt:
        status === OrderStatus.CONFIRMED
          ? (existing.confirmedAt ?? now)
          : existing.confirmedAt,
      shippedAt:
        status === OrderStatus.SHIPPED
          ? (existing.shippedAt ?? now)
          : existing.shippedAt,
      deliveredAt:
        status === OrderStatus.DELIVERED
          ? (existing.deliveredAt ?? now)
          : existing.deliveredAt,
      cancelledAt:
        status === OrderStatus.CANCELLED
          ? (existing.cancelledAt ?? now)
          : existing.cancelledAt,
    };
  }

  private async validateCustomer(dto: CreateOrderDto) {
    if (dto.customerId) {
      const customer = await this.prisma.user.findFirst({
        where: { id: dto.customerId, userType: UserType.CUSTOMER },
      });
      if (!customer) {
        throw new NotFoundException({
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Cliente no encontrado.',
        });
      }
      return;
    }

    if (!dto.guestEmail?.trim()) {
      throw new BadRequestException({
        code: 'ORDER_CUSTOMER_REQUIRED',
        message: 'Selecciona un cliente o ingresa el correo del invitado.',
      });
    }
  }

  private async resolveStoreContext(warehouseId?: string) {
    const settings = await this.prisma.storeSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      include: { defaultTaxRate: true, defaultWarehouse: true },
    });

    const warehouse = warehouseId
      ? await this.prisma.warehouse.findUnique({ where: { id: warehouseId } })
      : settings.defaultWarehouse;

    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException({
        code: 'WAREHOUSE_NOT_CONFIGURED',
        message: 'Configura un almacén predeterminado o selecciona uno válido.',
      });
    }

    const tax = settings.defaultTaxRate;
    const taxRatePercent = tax ? Number(tax.rate) : 0;

    return {
      warehouseId: warehouse.id,
      currencyCode: settings.defaultCurrencyCode,
      minOrderAmount:
        settings.minOrderAmount != null
          ? Number(settings.minOrderAmount)
          : null,
      taxRateId: tax?.id ?? null,
      taxRateName: tax?.name ?? null,
      taxRatePercent,
      pricesIncludeTax: settings.pricesIncludeTax,
    };
  }

  private async loadVariants(variantIds: string[]) {
    const uniqueIds = [...new Set(variantIds)];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      include: { product: true },
    });

    if (variants.length !== uniqueIds.length) {
      throw new NotFoundException({
        code: 'VARIANT_NOT_FOUND',
        message: 'Una o más variantes no existen o están inactivas.',
      });
    }

    return new Map(variants.map((variant) => [variant.id, variant]));
  }

  private buildOrderLines(
    items: { variantId: string; quantity: number }[],
    variants: Awaited<ReturnType<typeof this.loadVariants>>,
    taxRatePercent: number,
    pricesIncludeTax: boolean,
  ) {
    return items.map((item) => {
      const variant = variants.get(item.variantId);
      if (!variant) {
        throw new NotFoundException({
          code: 'VARIANT_NOT_FOUND',
          message: 'Variante no encontrada.',
        });
      }

      const unitPrice = Number(variant.price);
      const gross = unitPrice * item.quantity;
      let lineSubtotal = gross;
      let taxAmount = 0;

      if (taxRatePercent > 0) {
        if (pricesIncludeTax) {
          lineSubtotal = gross / (1 + taxRatePercent / 100);
          taxAmount = gross - lineSubtotal;
        } else {
          taxAmount = lineSubtotal * (taxRatePercent / 100);
        }
      }

      const lineTotal = pricesIncludeTax ? gross : lineSubtotal + taxAmount;

      return {
        variantId: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.name,
        quantity: item.quantity,
        unitPrice,
        compareAtPrice:
          variant.compareAtPrice != null
            ? Number(variant.compareAtPrice)
            : null,
        lineSubtotal,
        taxAmount,
        lineTotal,
      };
    });
  }

  private sumDecimals(values: number[]) {
    return values.reduce((sum, value) => sum + value, 0);
  }

  private async reserveStockForOrder(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
      warehouseId: string | null;
      items: { variantId: string | null; quantity: number }[];
    },
    performedById?: string,
  ) {
    if (!order.warehouseId) return;

    for (const item of order.items) {
      if (!item.variantId) continue;

      const level = await this.orderRepository.getStockLevelInTransaction(
        tx,
        order.warehouseId,
        item.variantId,
      );

      const onHand = level?.quantityOnHand ?? 0;
      const reserved = level?.quantityReserved ?? 0;
      const available = onHand - reserved;

      if (!level) {
        throw new BadRequestException({
          code: 'NO_STOCK_LEVEL',
          message: 'No hay stock registrado para una variante del pedido.',
        });
      }

      if (item.quantity > available) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_AVAILABLE_STOCK',
          message: `Stock insuficiente para completar el pedido. Disponible: ${available}.`,
        });
      }

      await this.orderRepository.updateReservedInTransaction(
        tx,
        order.warehouseId,
        item.variantId,
        reserved + item.quantity,
      );

      await this.orderRepository.createReservationInTransaction(tx, {
        warehouseId: order.warehouseId,
        variantId: item.variantId,
        orderId: order.id,
        quantity: item.quantity,
        reference: order.orderNumber,
        note: `Reserva automática pedido ${order.orderNumber}`,
        performedById: performedById ?? null,
      });
    }
  }

  private async releaseStockForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const reservations =
      await this.orderRepository.findActiveReservationsByOrder(tx, orderId);

    for (const reservation of reservations) {
      const level = await this.orderRepository.getStockLevelInTransaction(
        tx,
        reservation.warehouseId,
        reservation.variantId,
      );

      if (level) {
        await this.orderRepository.updateReservedInTransaction(
          tx,
          reservation.warehouseId,
          reservation.variantId,
          Math.max(0, level.quantityReserved - reservation.quantity),
        );
      }

      await this.orderRepository.releaseReservationInTransaction(
        tx,
        reservation.id,
      );
    }
  }

  private async restockForOrder(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
      warehouseId: string | null;
      items: { variantId: string | null; quantity: number }[];
    },
    performedById?: string,
  ) {
    if (!order.warehouseId) return;

    for (const item of order.items) {
      if (!item.variantId) continue;

      const level = await this.orderRepository.getStockLevelInTransaction(
        tx,
        order.warehouseId,
        item.variantId,
      );

      const quantityBefore = level?.quantityOnHand ?? 0;
      const quantityAfter = quantityBefore + item.quantity;

      await this.orderRepository.upsertStockLevelInTransaction(
        tx,
        order.warehouseId,
        item.variantId,
        quantityAfter,
      );

      await this.orderRepository.createMovementInTransaction(tx, {
        warehouseId: order.warehouseId,
        variantId: item.variantId,
        quantityChange: item.quantity,
        quantityBefore,
        quantityAfter,
        note: `Reingreso por reembolso pedido ${order.orderNumber}`,
        performedById: performedById ?? null,
      });
    }
  }

  private async fulfillStockForOrder(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
      warehouseId: string | null;
      items: { variantId: string | null; quantity: number }[];
    },
    performedById?: string,
  ) {
    if (!order.warehouseId) return;

    await this.releaseStockForOrder(tx, order.id);

    for (const item of order.items) {
      if (!item.variantId) continue;

      const level = await this.orderRepository.getStockLevelInTransaction(
        tx,
        order.warehouseId,
        item.variantId,
      );

      const quantityBefore = level?.quantityOnHand ?? 0;
      const quantityAfter = quantityBefore - item.quantity;

      if (quantityAfter < 0) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          message: 'Stock insuficiente para despachar el pedido.',
        });
      }

      await this.orderRepository.upsertStockLevelInTransaction(
        tx,
        order.warehouseId,
        item.variantId,
        quantityAfter,
      );

      await this.orderRepository.createMovementInTransaction(tx, {
        warehouseId: order.warehouseId,
        variantId: item.variantId,
        quantityChange: -item.quantity,
        quantityBefore,
        quantityAfter,
        note: `Despacho pedido ${order.orderNumber}`,
        performedById: performedById ?? null,
      });
    }
  }

  private mapOrderSummary(order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    source: OrderSource;
    deliveryMethod: OrderDeliveryMethod;
    customerId: string | null;
    guestEmail: string | null;
    guestFirstName: string | null;
    guestLastName: string | null;
    currencyCode: string;
    total: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
    customer: {
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
    warehouse: { name: string } | null;
    _count: { items: number };
  }): OrderSummaryRecord {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      source: order.source,
      deliveryMethod: order.deliveryMethod,
      customerId: order.customerId,
      customerName: this.resolveCustomerName(order),
      customerEmail: order.customer?.email ?? order.guestEmail,
      currencyCode: order.currencyCode,
      total: order.total.toString(),
      itemCount: order._count.items,
      warehouseName: order.warehouse?.name ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapOrderDetail(
    order: NonNullable<Awaited<ReturnType<PrismaOrderRepository['findById']>>>,
  ) {
    const summary = this.mapOrderSummary({
      ...order,
      _count: { items: order.items.length },
    });

    return {
      ...summary,
      guestEmail: order.guestEmail,
      guestFirstName: order.guestFirstName,
      guestLastName: order.guestLastName,
      guestPhone: order.guestPhone,
      warehouseId: order.warehouseId,
      subtotal: order.subtotal.toString(),
      taxAmount: order.taxAmount.toString(),
      shippingAmount: order.shippingAmount.toString(),
      discountAmount: order.discountAmount.toString(),
      taxRateId: order.taxRateId,
      taxRateName: order.taxRateName,
      taxRatePercent: order.taxRatePercent?.toString() ?? null,
      pricesIncludeTax: order.pricesIncludeTax,
      internalNotes: order.internalNotes,
      customerNotes: order.customerNotes,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      paidAt: order.paidAt,
      cancelReason: order.cancelReason,
      createdById: order.createdById,
      createdByName: this.resolveUserName(order.createdBy),
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        compareAtPrice: item.compareAtPrice?.toString() ?? null,
        taxAmount: item.taxAmount.toString(),
        lineSubtotal: item.lineSubtotal.toString(),
        lineTotal: item.lineTotal.toString(),
        sortOrder: item.sortOrder,
      })),
      addresses: order.addresses.map((address) => ({
        id: address.id,
        type: address.type,
        label: address.label,
        firstName: address.firstName,
        lastName: address.lastName,
        company: address.company,
        phone: address.phone,
        email: address.email,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        district: address.district,
        province: address.province,
        department: address.department,
        country: address.country,
        postalCode: address.postalCode,
      })),
      statusHistory: order.statusHistory.map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        fromPaymentStatus: entry.fromPaymentStatus,
        toPaymentStatus: entry.toPaymentStatus,
        note: entry.note,
        performedById: entry.performedById,
        performedByName: this.resolveUserName(entry.performedBy),
        createdAt: entry.createdAt,
      })),
    } satisfies OrderDetailRecord;
  }

  private buildAddressDedupKey(address: {
    type: string;
    addressLine1: string;
    addressLine2: string | null;
    district: string | null;
    province: string | null;
    department: string | null;
    country: string;
    postalCode: string | null;
  }) {
    return [
      address.type,
      address.addressLine1,
      address.addressLine2,
      address.district,
      address.province,
      address.department,
      address.country,
      address.postalCode,
    ]
      .map((part) => (part ?? '').trim().toLowerCase())
      .join('|');
  }

  private resolveCustomerName(order: {
    customer: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
    guestFirstName: string | null;
    guestLastName: string | null;
    guestEmail: string | null;
  }) {
    if (order.customer) {
      const name = [order.customer.firstName, order.customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      return name || order.customer.email;
    }

    const guestName = [order.guestFirstName, order.guestLastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return guestName || order.guestEmail;
  }

  private resolveUserName(
    user:
      | { firstName: string | null; lastName: string | null; email: string }
      | null
      | undefined,
  ) {
    if (!user) return null;
    const name = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || user.email;
  }
}
