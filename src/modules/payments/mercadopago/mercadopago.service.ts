import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoConfig,
  Order,
  PaymentMethod,
  WebhookSignatureValidator,
} from 'mercadopago';
import {
  OrderPaymentMethod,
  OrderPaymentStatus,
  PaymentGatewayProvider,
  PaymentTransactionStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrdersService } from '../../sales/application/services/orders.service';
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

type MpCheckoutChannel = 'card' | 'yape';

@Injectable()
export class MercadoPagoService implements OnModuleInit {
  private readonly logger = new Logger(MercadoPagoService.name);

  /** Medios del Checkout API Perú: tarjetas + Yape */
  private static readonly STOREFRONT_METHOD_IDS = [
    'visa',
    'master',
    'amex',
    'diners',
    'yape',
  ] as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
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
      sandboxPayerEmail: gateway!.isTestMode ? 'test@testuser.com' : null,
    };
  }

  async isEnabled(): Promise<boolean> {
    const gateway = await this.getGatewayRecord();
    return this.isGatewayReady(gateway);
  }

  async getAcceptedMethodsSummary() {
    const gateway = await this.getGatewayRecord();
    if (!this.isGatewayReady(gateway)) {
      return { methods: [] as const };
    }

    try {
      const accessToken = gateway!.secretKey!.trim();
      const client = new MercadoPagoConfig({ accessToken });
      const paymentMethodClient = new PaymentMethod(client);
      const methods = await paymentMethodClient.get();
      const storefrontIds = new Set<string>(
        MercadoPagoService.STOREFRONT_METHOD_IDS,
      );
      const active = methods.filter(
        (method) =>
          method.status === 'active' &&
          method.id &&
          storefrontIds.has(method.id),
      );

      const order: string[] = [...MercadoPagoService.STOREFRONT_METHOD_IDS];
      const sorted = [...active].sort(
        (a, b) => order.indexOf(a.id!) - order.indexOf(b.id!),
      );

      return {
        methods: sorted.map((method) => ({
          id: method.id!,
          name: this.resolveMethodDisplayName(method.id!, method.name),
          thumbnail: method.secure_thumbnail ?? method.thumbnail ?? null,
        })),
      };
    } catch (error) {
      this.logger.warn(
        'No se pudieron obtener los medios aceptados de Mercado Pago',
        error instanceof Error ? error.message : error,
      );
      return {
        methods: MercadoPagoService.STOREFRONT_METHOD_IDS.map((id) => ({
          id,
          name: this.resolveMethodDisplayName(id),
          thumbnail: null,
        })),
      };
    }
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
        channel: MpCheckoutChannel;
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

  async getOrderPaymentContext(
    orderId: string,
    actor: { customerId?: string; guestEmail?: string },
    payerEmail?: string,
  ) {
    const gateway = await this.getGatewayRecord();
    const gatewayReady = this.isGatewayReady(gateway);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, email: true } },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado.',
      });
    }

    this.assertOrderAccess(order, actor, payerEmail);

    const resolvedPayerEmail =
      order.guestEmail?.trim() ||
      order.customer?.email?.trim() ||
      payerEmail?.trim() ||
      '';

    const canPay = Boolean(
      gatewayReady &&
        order.paymentMethod === OrderPaymentMethod.GATEWAY &&
        order.paymentStatus !== OrderPaymentStatus.PAID &&
        resolvedPayerEmail,
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      currencyCode: order.currencyCode,
      payerEmail: resolvedPayerEmail,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      canPay,
    };
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
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `fs-order-${order.id}-${randomUUID()}`;
    const installments = dto.paymentChannel === 'yape' ? 1 : (dto.installments ?? 1);
    const paymentMethodType = this.resolveOrderPaymentMethodType(
      dto.paymentMethodId,
      dto.paymentChannel,
      dto.paymentMethodType,
    );
    const mpPayerEmail = this.resolveSandboxPayerEmail(
      dto.payerEmail,
      gateway!.isTestMode,
    );

    if (!dto.token?.trim()) {
      throw new BadRequestException({
        code: 'MISSING_PAYMENT_TOKEN',
        message: 'Falta el token de pago.',
      });
    }

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
            email: mpPayerEmail,
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
      const mpError = this.extractMercadoPagoError(error);
      this.logger.error(
        `Mercado Pago order.create failed for ${order.orderNumber}`,
        mpError.message,
      );
      throw new BadRequestException({
        code: 'MERCADOPAGO_PAYMENT_FAILED',
        message: mpError.userMessage,
        details: mpError.details,
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

    const isCompleted = paymentStatus === PaymentTransactionStatus.COMPLETED;
    const isFailed = paymentStatus === PaymentTransactionStatus.FAILED;
    const isPending = paymentStatus === PaymentTransactionStatus.PENDING;

    if (isCompleted) {
      await this.markOrderPaidFromGateway(order.id);
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      mercadoPagoOrderId: externalId,
      status: payment?.status ?? mpResponse.status ?? 'pending',
      statusDetail: payment?.status_detail ?? mpResponse.status_detail ?? null,
      paymentStatus: isCompleted
        ? OrderPaymentStatus.PAID
        : OrderPaymentStatus.PENDING,
      approved: isCompleted,
      pending: isPending,
      rejected: isFailed,
      paymentVoucherUrl: null,
    };
  }

  getWebhookSetup() {
    const appUrl = this.configService.get<string>('app.url', 'http://localhost:3000');
    const apiPrefix = this.configService.get<string>('app.apiPrefix', 'api');
    const webhookSecret = this.configService.get<string>(
      'mercadopago.webhookSecret',
      '',
    );

    return {
      webhookUrl: `${appUrl.replace(/\/$/, '')}/${apiPrefix}/webhooks/payments/MERCADO_PAGO`,
      recommendedEvents: ['order', 'payment', 'merchant_order'],
      secretConfigured: Boolean(webhookSecret.trim()),
      signatureValidation: webhookSecret.trim() ? 'required' : 'optional',
      documentationPath: 'docs/mercadopago-webhook.md',
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
    if (webhookSecret) {
      if (!headers?.xSignature) {
        throw new UnauthorizedException({
          code: 'MISSING_WEBHOOK_SIGNATURE',
          message: 'Falta la firma del webhook de Mercado Pago.',
        });
      }

      WebhookSignatureValidator.validate({
        xSignature: headers.xSignature,
        xRequestId: headers.xRequestId,
        dataId,
        secret: webhookSecret,
      });
    } else if (headers?.xSignature) {
      this.logger.warn(
        'Webhook de Mercado Pago recibido con firma pero MERCADOPAGO_WEBHOOK_SECRET no está configurado.',
      );
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
      await this.markOrderPaidFromGateway(orderId);
    }

    return { received: true, processed: true, orderId, status };
  }

  private async markOrderPaidFromGateway(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true },
    });

    if (!order || order.paymentStatus === OrderPaymentStatus.PAID) {
      return;
    }

    await this.ordersService.updateOrderPayment(orderId, {
      paymentStatus: OrderPaymentStatus.PAID,
      note: 'Pago confirmado por Mercado Pago.',
    });
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

    const hasCredentials = Boolean(publicKey.trim() && accessToken.trim());
    const isActive = enabled && hasCredentials;

    if (hasCredentials && !enabled) {
      this.logger.warn(
        'Mercado Pago tiene credenciales en .env pero MERCADOPAGO_ENABLED no es true. La opción no aparecerá en checkout.',
      );
    }

    await this.prisma.paymentGatewayConfig.upsert({
      where: { provider: PaymentGatewayProvider.MERCADO_PAGO },
      create: {
        provider: PaymentGatewayProvider.MERCADO_PAGO,
        displayName: 'Mercado Pago',
        isEnabled: isActive,
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
        isEnabled: isActive,
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
      `Mercado Pago sincronizado desde .env (${isActive ? 'habilitado' : 'deshabilitado'}, ${isTestMode ? 'prueba' : 'producción'})`,
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

  private resolveSandboxPayerEmail(email: string, isTestMode: boolean) {
    const normalized = email.trim().toLowerCase();
    if (!isTestMode) return email.trim();
    if (normalized.includes('@testuser.com')) return email.trim();
    return 'test@testuser.com';
  }

  private extractMercadoPagoError(error: unknown) {
    const fallback =
      'No pudimos procesar el pago con Mercado Pago. Verifica los datos e intenta de nuevo.';
    const details: string[] = [];

    const pushErrors = (errors: unknown) => {
      if (!Array.isArray(errors)) return;
      for (const item of errors) {
        if (!item || typeof item !== 'object') continue;
        const code = 'code' in item ? String(item.code) : '';
        const message = 'message' in item ? String(item.message) : '';
        if (message) details.push(message);
        if (code === 'invalid_email_for_sandbox') {
          details.push(
            'En modo prueba usa el correo test@testuser.com en el formulario de pago.',
          );
        }
        if (
          message.toLowerCase().includes('idempotency-key') ||
          message.toLowerCase().includes('idempotency key')
        ) {
          details.push(
            'Intenta pagar de nuevo. Si el error persiste, crea un pedido nuevo.',
          );
        }
      }
    };

    if (error && typeof error === 'object') {
      if ('errors' in error) pushErrors((error as { errors: unknown }).errors);
      if ('cause' in error && error.cause && typeof error.cause === 'object') {
        const cause = error.cause as { errors?: unknown; message?: string };
        pushErrors(cause.errors);
        if (cause.message) details.push(cause.message);
      }
      if (error instanceof Error && error.message) {
        details.push(error.message);
      }
    }

    const uniqueDetails = [...new Set(details.filter(Boolean))];
    const userMessage = uniqueDetails[0] ?? fallback;

    return {
      message: uniqueDetails.join(' | ') || fallback,
      userMessage,
      details:
        process.env.NODE_ENV === 'development' && uniqueDetails.length
          ? uniqueDetails
          : undefined,
    };
  }

  private resolveMethodDisplayName(id: string, fallback?: string) {
    const labels: Record<string, string> = {
      account_money: 'Mercado Pago',
      visa: 'Visa',
      master: 'Mastercard',
      amex: 'American Express',
      diners: 'Diners Club',
      yape: 'Yape',
    };

    return labels[id] ?? fallback ?? id;
  }

  private resolveOrderPaymentMethodType(
    paymentMethodId: string,
    channel: MpCheckoutChannel,
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
