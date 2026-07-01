import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrderPaymentMethod,
  OrderPaymentStatus,
} from '../../../generated/prisma/client';
import { OrderCreatedEvent } from '../../../events/order-created.event';
import { OrderExpiredEvent } from '../../../events/order-expired.event';
import { OrderPaidEvent } from '../../../events/order-paid.event';
import { OrderRefundedEvent } from '../../../events/order-refunded.event';
import { OrderShippedEvent } from '../../../events/order-shipped.event';
import { OrderStatusChangedEvent } from '../../../events/order-status-changed.event';
import { MailService } from '../../../infrastructure/mail/mail.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OrderEmailListener {
  private readonly logger = new Logger(OrderEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    if (!(await this.isOrderEmailEnabled())) return;

    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    const isGatewayPending =
      order.paymentMethod === OrderPaymentMethod.GATEWAY &&
      order.paymentStatus === OrderPaymentStatus.PENDING;

    const paymentUrl = isGatewayPending
      ? this.buildPaymentUrl(order.id, order.recipientEmail, order.guestEmail)
      : null;

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: isGatewayPending
        ? `Completa el pago de tu pedido ${order.orderNumber}`
        : `Pedido recibido ${order.orderNumber}`,
      heading: isGatewayPending
        ? 'Tu pedido está listo para pagar'
        : 'Hemos recibido tu pedido',
      body: isGatewayPending
        ? `Registramos tu pedido ${order.orderNumber}. Usa el botón de abajo para pagar de forma segura con Mercado Pago. Si no completas el pago a tiempo, el pedido puede cancelarse automáticamente.`
        : `Tu pedido ${order.orderNumber} fue registrado correctamente. Te avisaremos cuando confirmemos el pago.`,
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
      actionUrl: paymentUrl,
      actionLabel: paymentUrl ? 'Pagar ahora' : undefined,
    });
  }

  @OnEvent('order.paid')
  async handleOrderPaid(event: OrderPaidEvent) {
    if (!(await this.isOrderEmailEnabled())) return;

    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: `Pago confirmado ${order.orderNumber}`,
      heading: 'Pago confirmado',
      body: `Recibimos el pago de tu pedido ${order.orderNumber}. Estamos preparando tu compra.`,
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
    });
  }

  @OnEvent('order.expired')
  async handleOrderExpired(event: OrderExpiredEvent) {
    if (!(await this.isOrderEmailEnabled())) return;

    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: `Pedido cancelado ${order.orderNumber}`,
      heading: 'Pedido cancelado por falta de pago',
      body: `Tu pedido ${order.orderNumber} fue cancelado porque no recibimos el pago dentro del plazo establecido. Si deseas continuar, puedes crear un nuevo pedido en la tienda.`,
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
    });
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(event: OrderShippedEvent) {
    if (!(await this.isOrderEmailEnabled())) return;

    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    const trackingParts = [
      order.trackingNumber ? `Guía: ${order.trackingNumber}` : null,
      order.carrier ? `Transportista: ${order.carrier}` : null,
      order.trackingUrl ? `Seguimiento: ${order.trackingUrl}` : null,
    ].filter(Boolean);

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: `Pedido enviado ${order.orderNumber}`,
      heading: 'Tu pedido fue enviado',
      body:
        trackingParts.length > 0
          ? `Tu pedido ${order.orderNumber} ya fue despachado.\n\n${trackingParts.join('\n')}`
          : `Tu pedido ${order.orderNumber} ya fue despachado. Pronto lo recibirás.`,
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
    });
  }

  /**
   * Estados con evento dedicado y contenido más rico (ver handlers arriba).
   * Se excluyen aquí para no duplicar el correo.
   */
  private static readonly STATUS_CHANGE_EMAIL_SUPPRESSED = new Set(['SHIPPED']);

  @OnEvent('order.status.changed')
  async handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    if (OrderEmailListener.STATUS_CHANGE_EMAIL_SUPPRESSED.has(event.toStatus)) {
      return;
    }

    const content = this.buildStatusChangeEmailContent(
      event.toStatus,
      event.note,
    );
    if (!content) return;

    if (!(await this.isOrderEmailEnabled())) return;

    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: content.subject(order.orderNumber),
      heading: content.heading,
      body: content.body(order.orderNumber),
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
    });
  }

  private buildStatusChangeEmailContent(toStatus: string, note?: string | null) {
    switch (toStatus) {
      case 'CONFIRMED':
        return {
          subject: (orderNumber: string) => `Pedido confirmado ${orderNumber}`,
          heading: 'Tu pedido fue confirmado',
          body: (orderNumber: string) =>
            `Confirmamos tu pedido ${orderNumber}. Pronto comenzaremos a prepararlo.`,
        };
      case 'PROCESSING':
        return {
          subject: (orderNumber: string) => `Preparando tu pedido ${orderNumber}`,
          heading: 'Estamos preparando tu pedido',
          body: (orderNumber: string) =>
            `Tu pedido ${orderNumber} está en preparación. Te avisaremos cuando esté listo.`,
        };
      case 'READY_FOR_PICKUP':
        return {
          subject: (orderNumber: string) =>
            `Pedido listo para recoger ${orderNumber}`,
          heading: 'Tu pedido está listo para recoger',
          body: (orderNumber: string) =>
            `Tu pedido ${orderNumber} ya está listo para que lo recojas en tienda.`,
        };
      case 'DELIVERED':
        return {
          subject: (orderNumber: string) => `Pedido entregado ${orderNumber}`,
          heading: '¡Tu pedido fue entregado!',
          body: (orderNumber: string) =>
            `Confirmamos la entrega de tu pedido ${orderNumber}. ¡Gracias por tu compra!`,
        };
      case 'CANCELLED':
        return {
          subject: (orderNumber: string) => `Pedido cancelado ${orderNumber}`,
          heading: 'Tu pedido fue cancelado',
          body: (orderNumber: string) =>
            note
              ? `Tu pedido ${orderNumber} fue cancelado.\n\nMotivo: ${note}`
              : `Tu pedido ${orderNumber} fue cancelado.`,
        };
      default:
        return null;
    }
  }

  @OnEvent('order.refunded')
  async handleOrderRefunded(event: OrderRefundedEvent) {
    if (!(await this.isOrderEmailEnabled())) return;

    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    const formattedAmount = this.formatCurrency(
      event.amount,
      event.currencyCode,
    );

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: event.isFullRefund
        ? `Pedido reembolsado ${order.orderNumber}`
        : `Reembolso parcial ${order.orderNumber}`,
      heading: event.isFullRefund
        ? 'Tu pedido fue reembolsado'
        : 'Procesamos un reembolso parcial',
      body: event.isFullRefund
        ? `Procesamos el reembolso total de tu pedido ${order.orderNumber} por ${formattedAmount}.${
            event.note ? `\n\n${event.note}` : ''
          }`
        : `Procesamos un reembolso parcial de tu pedido ${order.orderNumber} por ${formattedAmount}. El resto de tu pedido continúa su proceso normal.${
            event.note ? `\n\n${event.note}` : ''
          }`,
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
    });
  }

  private formatCurrency(amount: number, currencyCode: string) {
    try {
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currencyCode}`;
    }
  }

  private async isOrderEmailEnabled() {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { orderConfirmationEmailEnabled: true },
    });

    return settings?.orderConfirmationEmailEnabled !== false;
  }

  private buildPaymentUrl(
    orderId: string,
    recipientEmail: string,
    guestEmail: string | null,
  ) {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const url = new URL(`/checkout/pagar/${orderId}`, frontendUrl);

    if (guestEmail && guestEmail.toLowerCase() === recipientEmail.toLowerCase()) {
      url.searchParams.set('email', recipientEmail);
    }

    return url.toString();
  }

  private async loadOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      this.logger.warn(
        `Pedido ${orderId} no encontrado para notificación por correo.`,
      );
      return null;
    }

    const recipientEmail = order.customer?.email ?? order.guestEmail;
    if (!recipientEmail) return null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      recipientEmail,
      guestEmail: order.guestEmail,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total.toString(),
      currencyCode: order.currencyCode,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      trackingUrl: order.trackingUrl,
    };
  }
}
