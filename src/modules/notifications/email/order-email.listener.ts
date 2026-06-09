import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '../../../events/order-created.event';
import { OrderPaidEvent } from '../../../events/order-paid.event';
import { OrderShippedEvent } from '../../../events/order-shipped.event';
import { MailService } from '../../../infrastructure/mail/mail.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OrderEmailListener {
  private readonly logger = new Logger(OrderEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    const order = await this.loadOrder(event.orderId);
    if (!order?.recipientEmail) return;

    await this.mailService.sendOrderEmail({
      to: order.recipientEmail,
      subject: `Pedido recibido ${order.orderNumber}`,
      heading: 'Hemos recibido tu pedido',
      body: `Tu pedido ${order.orderNumber} fue registrado correctamente. Te avisaremos cuando confirmemos el pago.`,
      orderNumber: order.orderNumber,
      total: order.total,
      currencyCode: order.currencyCode,
    });
  }

  @OnEvent('order.paid')
  async handleOrderPaid(event: OrderPaidEvent) {
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

  @OnEvent('order.shipped')
  async handleOrderShipped(event: OrderShippedEvent) {
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
      orderNumber: order.orderNumber,
      recipientEmail,
      total: order.total.toString(),
      currencyCode: order.currencyCode,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      trackingUrl: order.trackingUrl,
    };
  }
}
