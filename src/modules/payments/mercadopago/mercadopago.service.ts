import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Order, PaymentMethod, WebhookSignatureValidator } from 'mercadopago';
import {
  OrderPaymentMethod,
  OrderPaymentStatus,
  PaymentGatewayProvider,
  PaymentTransactionStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ProcessMercadoPagoPaymentDto } from './dto/process-mercadopago-payment.dto';

type MpOrderResponse = {
  id?: string;
  status?: string;
  status_detail?: string;
  transactions?: {
    payments?: Array<{
      id?: string;
      status?: string;
      status_detail?: string;
    }>;
  };
};

@Injectable()
export class MercadoPagoService implements OnModuleInit {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncGatewayFromEnv();
  }

  async getStoreConfig() {
    const gateway = await this.getGatewayRecord();
    if (!this.isGatewayReady(gateway)) {
      return { enabled: false as const };
    }

    return {
      enabled: true as const,
      publicKey: gateway!.publicKey!,
      isTestMode: gateway!.isTestMode,
    };
  }

  async isEnabled(): Promise<boolean> {
    const gateway = await this.getGatewayRecord();
    return this.isGatewayReady(gateway);
  }

  async getStorePaymentMethods() {
    const gateway = await this.getGatewayRecord();
    if (!this.isGatewayReady(gateway)) {
      return { methods: [] as const };
    }

    const accessToken = gateway!.secretKey!.trim();
    const client = new MercadoPagoConfig({ accessToken });
    const paymentMethodClient = new PaymentMethod(client);

    try {
      const methods = await paymentMethodClient.get();
      const active = methods.filter((method) => method.status === 'active');
      const channels: Array<{
        channel: 'card' | 'yape';
        label: string;
        paymentMethodId?: string;
        thumbnail?: string;
        maxAmount?: number;
      }> = [];

      const hasCards = active.some(
        (method) =>
          method.id !== 'yape' &&
          ['credit_card', 'debit_card', 'prepaid_card'].includes(
            method.payment_type_id ?? '',
          ),
      );

      if (hasCards) {
        channels.push({
          channel: 'card',
          label: 'Tarjeta de crédito o débito',
        });
      }

      const yape = active.find((method) => method.id === 'yape');
      if (yape) {
        channels.push({
          channel: 'yape',
          label: 'Yape',
          paymentMethodId: 'yape',
          thumbnail: yape.secure_thumbnail ?? yape.thumbnail,
          maxAmount: yape.max_allowed_amount,
        });
      }

      return { methods: channels };
    } catch (error) {
      this.logger.warn(
        'No se pudieron obtener los medios de pago de Mercado Pago',
        error instanceof Error ? error.message : error,
      );
      return {
        methods: [
          { channel: 'card' as const, label: 'Tarjeta de crédito o débito' },
        ],
      };
    }
  }

  async processOrderPayment(
    orderId: string,
    dto: ProcessMercadoPagoPaymentDto,
    actor: { customerId?: string; guestEmail?: string },
  ) {
    const gateway = await this.getGatewayRecord();
    if (!this.isGatewayReady(gateway)) {
      throw new BadRequestException({
        code: 'GATEWAY_DISABLED',
        message: 'Mercado Pago no está habilitado.',
      });
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, email: true } },
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado.',
      });
    }

    this.assertOrderAccess(order, actor, dto.payerEmail);

    if (order.paymentMethod !== OrderPaymentMethod.GATEWAY) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_METHOD',
        message: 'Este pedido no usa Mercado Pago.',
      });
    }

    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw new BadRequestException({
        code: 'ORDER_ALREADY_PAID',
        message: 'Este pedido ya fue pagado.',
      });
    }

    const accessToken = gateway!.secretKey!.trim();
    const client = new MercadoPagoConfig({ accessToken });
    const mpOrder = new Order(client);
    const totalAmount = Number(order.total).toFixed(2);
    const idempotencyKey = `fs-order-${order.id}`;
    const installments = dto.paymentChannel === 'yape' ? 1 : (dto.installments ?? 1);
    const paymentMethodType = this.resolveOrderPaymentMethodType(
      dto.paymentMethodId,
      dto.paymentChannel,
      dto.paymentMethodType,
    );

    let mpResponse: MpOrderResponse;

    try {
      const result = await mpOrder.create({
        body: {
          type: 'online',
          processing_mode: 'automatic',
          total_amount: totalAmount,
          external_reference: order.id,
          description: `Pedido ${order.orderNumber}`,
          currency: order.currencyCode,
          payer: {
            email: dto.payerEmail,
            ...(dto.payerIdentification?.type && dto.payerIdentification.number
              ? {
                  identification: {
                    type: dto.payerIdentification.type,
                    number: dto.payerIdentification.number,
                  },
                }
              : {}),
          },
          items: order.items.map((item) => ({
            title: item.productName,
            unit_price: Number(item.unitPrice).toFixed(2),
            quantity: item.quantity,
            description: item.variantName ?? item.productName,
          })),
          transactions: {
            payments: [
              {
                amount: totalAmount,
                payment_method: {
                  id: dto.paymentMethodId,
                  type: paymentMethodType,
                  token: dto.token,
                  installments,
                  ...(dto.paymentChannel === 'card'
                    ? { statement_descriptor: 'FACTOSYS STORE' }
                    : {}),
                },
              },
            ],
          },
        },
        requestOptions: { idempotencyKey },
      });

      mpResponse = result as MpOrderResponse;
    } catch (error) {
      this.logger.error(
        `Mercado Pago order.create failed for ${order.orderNumber}`,
        error instanceof Error ? error.message : error,
      );
      throw new BadRequestException({
        code: 'MERCADOPAGO_PAYMENT_FAILED',
        message:
          dto.paymentChannel === 'yape'
            ? 'No pudimos procesar el pago con Yape. Verifica el celular y el código OTP.'
            : 'No pudimos procesar el pago con Mercado Pago. Verifica los datos de la tarjeta.',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? [error.message]
            : undefined,
      });
    }

    const payment = mpResponse.transactions?.payments?.[0];
    const externalId = mpResponse.id ?? payment?.id ?? null;
    const paymentStatus = this.resolvePaymentStatus(
      payment?.status ?? mpResponse.status,
    );

    await this.savePaymentTransaction({
      orderId: order.id,
      externalId,
      amount: order.total,
      currencyCode: order.currencyCode,
      status: paymentStatus,
      metadata: mpResponse,
    });

    if (paymentStatus === PaymentTransactionStatus.COMPLETED) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: OrderPaymentStatus.PAID,
          paidAt: new Date(),
        },
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      mercadoPagoOrderId: externalId,
      status: payment?.status ?? mpResponse.status ?? 'pending',
      statusDetail: payment?.status_detail ?? mpResponse.status_detail ?? null,
      paymentStatus:
        paymentStatus === PaymentTransactionStatus.COMPLETED
          ? OrderPaymentStatus.PAID
          : OrderPaymentStatus.PENDING,
      approved: paymentStatus === PaymentTransactionStatus.COMPLETED,
    };
  }

  async handleWebhookNotification(
    payload: Record<string, unknown>,
    headers?: {
      xSignature?: string;
      xRequestId?: string;
      dataId?: string;
    },
  ) {
    const gateway = await this.getGatewayRecord();
    if (!this.isGatewayReady(gateway)) {
      return { received: true, processed: false, reason: 'gateway_disabled' };
    }

    const dataId = headers?.dataId || this.readNestedId(payload);
    if (!dataId) {
      return { received: true, processed: false, reason: 'missing_id' };
    }

    const webhookSecret = gateway!.webhookSecret?.trim();
    if (webhookSecret && headers?.xSignature) {
      WebhookSignatureValidator.validate({
        xSignature: headers.xSignature,
        xRequestId: headers.xRequestId,
        dataId,
        secret: webhookSecret,
      });
    }

    const topic = String(payload.type ?? payload.action ?? payload.topic ?? '');
    if (
      topic &&
      !topic.includes('payment') &&
      !topic.includes('order') &&
      !topic.includes('merchant_order')
    ) {
      return { received: true, processed: false, reason: 'ignored_topic' };
    }

    const accessToken = gateway!.secretKey!.trim();
    const client = new MercadoPagoConfig({ accessToken });
    const orderClient = new Order(client);

    let mpOrderDetails: Record<string, unknown>;
    try {
      const mpOrder = await orderClient.get({ id: dataId });
      mpOrderDetails = mpOrder as unknown as Record<string, unknown>;
    } catch {
      mpOrderDetails = await this.fetchLegacyPaymentDetails(accessToken, dataId);
    }

    const orderId = this.readExternalReference(mpOrderDetails);
    if (!orderId) {
      return { received: true, processed: false, reason: 'missing_order' };
    }

    const payment = this.readOrderPayment(mpOrderDetails);
    const status = this.resolvePaymentStatus(
      String(payment?.status ?? mpOrderDetails.status ?? ''),
    );

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    await this.savePaymentTransaction({
      orderId,
      externalId: String(mpOrderDetails.id ?? dataId),
      amount: order?.total ?? 0,
      currencyCode: order?.currencyCode ?? 'PEN',
      status,
      metadata: mpOrderDetails,
    });

    if (status === PaymentTransactionStatus.COMPLETED) {
      await this.prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { not: OrderPaymentStatus.PAID } },
        data: {
          paymentStatus: OrderPaymentStatus.PAID,
          paidAt: new Date(),
        },
      });
    }

    return { received: true, processed: true, orderId, status };
  }

  private async syncGatewayFromEnv() {
    const enabled = this.configService.get<boolean>('mercadopago.enabled', false);
    const publicKey = this.configService.get<string>('mercadopago.publicKey', '');
    const accessToken = this.configService.get<string>(
      'mercadopago.accessToken',
      '',
    );
    const isTestMode = this.configService.get<boolean>(
      'mercadopago.isTestMode',
      true,
    );
    const webhookSecret = this.configService.get<string>(
      'mercadopago.webhookSecret',
      '',
    );
    const appId = this.configService.get<string>('mercadopago.appId', '');
    const userId = this.configService.get<string>('mercadopago.userId', '');

    if (!publicKey && !accessToken) return;

    await this.prisma.paymentGatewayConfig.upsert({
      where: { provider: PaymentGatewayProvider.MERCADO_PAGO },
      create: {
        provider: PaymentGatewayProvider.MERCADO_PAGO,
        displayName: 'Mercado Pago',
        isEnabled: enabled && Boolean(publicKey && accessToken),
        isTestMode,
        publicKey: publicKey || null,
        secretKey: accessToken || null,
        webhookSecret: webhookSecret || null,
        config: {
          appId: appId || undefined,
          userId: userId || undefined,
        },
      },
      update: {
        isEnabled: enabled && Boolean(publicKey && accessToken),
        isTestMode,
        publicKey: publicKey || null,
        secretKey: accessToken || null,
        webhookSecret: webhookSecret || null,
        config: {
          appId: appId || undefined,
          userId: userId || undefined,
        },
      },
    });

    this.logger.log(
      `Mercado Pago sincronizado desde .env (${enabled ? 'habilitado' : 'deshabilitado'}, ${isTestMode ? 'prueba' : 'producción'})`,
    );
  }

  private async getGatewayRecord() {
    return this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: PaymentGatewayProvider.MERCADO_PAGO },
    });
  }

  private isGatewayReady(
    gateway: Awaited<ReturnType<MercadoPagoService['getGatewayRecord']>>,
  ) {
    return Boolean(
      gateway?.isEnabled && gateway.publicKey?.trim() && gateway.secretKey?.trim(),
    );
  }

  private assertOrderAccess(
    order: {
      customerId: string | null;
      guestEmail: string | null;
      customer: { id: string; email: string } | null;
    },
    actor: { customerId?: string; guestEmail?: string },
    payerEmail?: string,
  ) {
    if (actor.customerId && order.customerId === actor.customerId) {
      return;
    }

    if (actor.guestEmail && order.guestEmail === actor.guestEmail) {
      return;
    }

    if (
      payerEmail &&
      order.guestEmail &&
      order.guestEmail.toLowerCase() === payerEmail.toLowerCase()
    ) {
      return;
    }

    throw new NotFoundException({
      code: 'ORDER_NOT_FOUND',
      message: 'Pedido no encontrado.',
    });
  }

  private async savePaymentTransaction(params: {
    orderId: string;
    externalId: string | null;
    amount: number | { toString(): string };
    currencyCode: string;
    status: PaymentTransactionStatus;
    metadata: unknown;
  }) {
    const amount = Number(params.amount);

    const existing = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: params.orderId,
        provider: PaymentGatewayProvider.MERCADO_PAGO,
      },
    });

    const data = {
      externalId: params.externalId,
      amount,
      currencyCode: params.currencyCode,
      status: params.status,
      metadata: params.metadata as object,
    };

    if (existing) {
      await this.prisma.paymentTransaction.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await this.prisma.paymentTransaction.create({
      data: {
        orderId: params.orderId,
        provider: PaymentGatewayProvider.MERCADO_PAGO,
        ...data,
      },
    });
  }

  private resolveOrderPaymentMethodType(
    paymentMethodId: string,
    channel: 'card' | 'yape',
    paymentMethodType?: string,
  ) {
    if (paymentMethodType) {
      return paymentMethodType;
    }

    if (channel === 'yape' || paymentMethodId === 'yape') {
      return 'debit_card';
    }

    if (paymentMethodId.startsWith('deb')) {
      return 'debit_card';
    }

    return 'credit_card';
  }

  private readOrderPayment(details: Record<string, unknown>) {
    const transactions = details.transactions;
    if (!transactions || typeof transactions !== 'object') {
      return null;
    }

    const payments = (transactions as { payments?: unknown }).payments;
    if (!Array.isArray(payments) || payments.length === 0) {
      return null;
    }

    const first = payments[0];
    if (!first || typeof first !== 'object') {
      return null;
    }

    return first as { status?: string; status_detail?: string; id?: string };
  }

  private resolvePaymentStatus(status: string | undefined) {
    const normalized = (status ?? '').toLowerCase();
    if (
      ['approved', 'accredited', 'processed', 'completed'].includes(normalized)
    ) {
      return PaymentTransactionStatus.COMPLETED;
    }
    if (['rejected', 'cancelled', 'failed'].includes(normalized)) {
      return PaymentTransactionStatus.FAILED;
    }
    return PaymentTransactionStatus.PENDING;
  }

  private readNestedId(payload: Record<string, unknown>) {
    const data = payload.data;
    if (data && typeof data === 'object' && 'id' in data) {
      return String((data as { id: unknown }).id);
    }
    if (typeof payload.id === 'string' || typeof payload.id === 'number') {
      return String(payload.id);
    }
    return '';
  }

  private readExternalReference(details: Record<string, unknown>) {
    const direct = details.external_reference;
    if (typeof direct === 'string') return direct;
    const order = details.order;
    if (order && typeof order === 'object' && 'external_reference' in order) {
      return String((order as { external_reference: unknown }).external_reference);
    }
    return '';
  }

  private async fetchLegacyPaymentDetails(accessToken: string, resourceId: string) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${resourceId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      const orderResponse = await fetch(
        `https://api.mercadopago.com/v1/orders/${resourceId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!orderResponse.ok) {
        return { id: resourceId, status: 'pending' };
      }
      return (await orderResponse.json()) as Record<string, unknown>;
    }

    return (await response.json()) as Record<string, unknown>;
  }
}
