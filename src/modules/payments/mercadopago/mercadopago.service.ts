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
type MpSandboxPayerEmailMode = 'order' | 'testuser' | 'synthetic';

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
    await this.validateCredentialEnvironment();
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
      sandboxPayerEmailMode: this.readSandboxPayerEmailMode(gateway),
      sandboxPayerEmail:
        gateway!.isTestMode &&
        this.readSandboxPayerEmailMode(gateway) === 'testuser'
          ? 'test@testuser.com'
          : null,
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
        items: { orderBy: { sortOrder: 'asc' } },
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
    const mercadoPagoItems = this.buildMercadoPagoOrderItems(order);
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `fs-order-${order.id}-${randomUUID()}`;
    const installments = dto.paymentChannel === 'yape' ? 1 : (dto.installments ?? 1);
    const paymentMethodType = this.resolveOrderPaymentMethodType(
      dto.paymentMethodId,
      dto.paymentChannel,
      dto.paymentMethodType,
    );
    const mpPayerEmail = this.resolveSandboxPayerEmail(
      order.id,
      dto.payerEmail,
      gateway!.isTestMode,
      this.readSandboxPayerEmailMode(gateway),
    );
    const payerIdentification = this.resolvePayerIdentification(
      dto.payerIdentification,
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
            ...(payerIdentification
              ? { identification: payerIdentification }
              : {}),
          },
          items: mercadoPagoItems,
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
      const failedOrder = this.parseMercadoPagoFailedOrder(
        error,
        gateway!.isTestMode,
      );
      if (failedOrder) {
        const payment = failedOrder.mpResponse.transactions?.payments?.[0];
        const externalId =
          failedOrder.mpResponse.id ?? payment?.id ?? null;

        await this.savePaymentTransaction({
          orderId: order.id,
          externalId,
          amount: order.total,
          currencyCode: order.currencyCode,
          status: PaymentTransactionStatus.FAILED,
          metadata: failedOrder.mpResponse,
        });

        this.logger.warn(
          `Mercado Pago payment rejected for ${order.orderNumber}: ${failedOrder.statusDetail || 'unknown'}`,
        );

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          mercadoPagoOrderId: externalId,
          status: payment?.status ?? failedOrder.mpResponse.status ?? 'failed',
          statusDetail: failedOrder.userMessage,
          paymentStatus: OrderPaymentStatus.PENDING,
          approved: false,
          pending: false,
          rejected: true,
          paymentVoucherUrl: null,
        };
      }

      const mpError = this.extractMercadoPagoError(
        error,
        gateway!.isTestMode,
      );
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
    const rawStatusDetail =
      payment?.status_detail ?? mpResponse.status_detail ?? '';

    if (isCompleted) {
      await this.markOrderPaidFromGateway(order.id);
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      mercadoPagoOrderId: externalId,
      status: payment?.status ?? mpResponse.status ?? 'pending',
      statusDetail: isFailed
        ? this.formatMercadoPagoStatusDetail(
            rawStatusDetail,
            gateway!.isTestMode,
          )
        : rawStatusDetail || null,
      paymentStatus: isCompleted
        ? OrderPaymentStatus.PAID
        : OrderPaymentStatus.PENDING,
      approved: isCompleted,
      pending: isPending,
      rejected: isFailed,
      paymentVoucherUrl: null,
    };
  }

  async getWebhookSetup() {
    const appUrl = this.configService.get<string>('app.url', 'http://localhost:3000');
    const apiPrefix = this.configService.get<string>('app.apiPrefix', 'api');
    const webhookSecret = this.configService.get<string>(
      'mercadopago.webhookSecret',
      '',
    );
    const credentials = await this.getCredentialDiagnostics();

    return {
      webhookUrl: `${appUrl.replace(/\/$/, '')}/${apiPrefix}/webhooks/payments/MERCADO_PAGO`,
      recommendedEvents: ['order', 'payment', 'merchant_order'],
      secretConfigured: Boolean(webhookSecret.trim()),
      signatureValidation: webhookSecret.trim() ? 'required' : 'optional',
      documentationPath: 'docs/mercadopago-webhook.md',
      credentials,
    };
  }

  async getCredentialDiagnostics() {
    const gateway = await this.getGatewayRecord();
    if (!this.isGatewayReady(gateway)) {
      return {
        configured: false,
        healthy: false,
        issues: ['Mercado Pago no tiene Public Key y Access Token configurados.'],
      };
    }

    const issues: string[] = [];
    const publicKey = gateway!.publicKey!.trim();
    const accessToken = gateway!.secretKey!.trim();
    const isTestMode = gateway!.isTestMode;
    const configuredUserId = String(
      (gateway!.config as { userId?: string } | null)?.userId ?? '',
    );

    let liveMode: boolean | null = null;
    let siteId: string | null = null;
    let userId: number | null = null;
    let isTestUserAccount = false;

    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        issues.push(
          `ACCESS_TOKEN rechazado por Mercado Pago (HTTP ${response.status}).`,
        );
      } else {
        userId =
          typeof body.id === 'number'
            ? body.id
            : Number(body.id) || null;
        siteId = typeof body.site_id === 'string' ? body.site_id : null;
        if (typeof body.live_mode === 'boolean') {
          liveMode = body.live_mode;
        }
        const tags = Array.isArray(body.tags) ? body.tags : [];
        isTestUserAccount = tags.includes('test_user');
      }
    } catch {
      issues.push('No se pudo validar el ACCESS_TOKEN con Mercado Pago.');
    }

    if (isTestMode && liveMode === true) {
      issues.push(
        'MERCADOPAGO_TEST_MODE=true pero el ACCESS_TOKEN es de producción (live_mode=true). Copia Public Key y Access Token desde la pestaña Credenciales de prueba.',
      );
    }

    if (isTestMode && liveMode === null && !isTestUserAccount) {
      issues.push(
        'No se pudo confirmar el modo del token con Mercado Pago. Verifica que Public Key y Access Token sean del mismo bloque de credenciales.',
      );
    }

    if (userId && configuredUserId && String(userId) !== configuredUserId) {
      issues.push(
        'MERCADOPAGO_USER_ID no coincide con el usuario del ACCESS_TOKEN.',
      );
    }

    if (siteId && siteId !== 'MPE') {
      issues.push(
        `El ACCESS_TOKEN pertenece al sitio ${siteId}. Para Perú debe ser MPE.`,
      );
    }

    return {
      configured: true,
      isTestMode,
      liveMode,
      siteId,
      userId,
      isTestUserAccount,
      publicKeyPreview: `${publicKey.slice(0, 16)}…`,
      healthy: issues.length === 0,
      issues,
      sandboxPayerEmailMode: this.readSandboxPayerEmailMode(gateway),
      sandboxPayerEmail:
        isTestMode &&
        this.readSandboxPayerEmailMode(gateway) === 'testuser'
          ? 'test@testuser.com'
          : null,
    };
  }

  private async validateCredentialEnvironment() {
    const diagnostics = await this.getCredentialDiagnostics();
    if (!diagnostics.configured) return;

    if (diagnostics.healthy) {
      const accountType = diagnostics.isTestUserAccount
        ? 'usuario test_user'
        : diagnostics.isTestMode
          ? 'prueba'
          : 'producción';
      this.logger.log(
        `Mercado Pago: credenciales OK (${accountType}, site ${diagnostics.siteId ?? 'n/d'}, correo: ${this.describeSandboxPayerEmailMode(diagnostics.sandboxPayerEmailMode ?? 'testuser')}).`,
      );
      return;
    }

    for (const issue of diagnostics.issues) {
      this.logger.error(`Mercado Pago: ${issue}`);
    }
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

    const sandboxPayerEmailMode = hasCredentials
      ? await this.resolveSandboxPayerEmailMode(accessToken.trim())
      : 'testuser';

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
          sandboxPayerEmailMode,
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
          sandboxPayerEmailMode,
        },
      },
    });

    this.logger.log(
      `Mercado Pago sincronizado desde .env (${isActive ? 'habilitado' : 'deshabilitado'}, ${isTestMode ? 'prueba' : 'producción'}, correo sandbox: ${this.describeSandboxPayerEmailMode(sandboxPayerEmailMode)})`,
    );
  }

  private describeSandboxPayerEmailMode(mode: MpSandboxPayerEmailMode) {
    if (mode === 'order') return 'correo del pedido';
    if (mode === 'synthetic') return 'test_payer_XXXXXXXXXX@testuser.com (generado por pedido)';
    return 'test@testuser.com';
  }

  private readSandboxPayerEmailMode(
    gateway: Awaited<ReturnType<MercadoPagoService['getGatewayRecord']>>,
  ): MpSandboxPayerEmailMode {
    const config = gateway?.config;
    if (!config || typeof config !== 'object') return 'testuser';
    const mode = (config as { sandboxPayerEmailMode?: string })
      .sandboxPayerEmailMode;
    if (mode === 'order' || mode === 'synthetic') return mode;
    return 'testuser';
  }

  /**
   * Detecta qué correo de comprador acepta Mercado Pago según el tipo de cuenta:
   * - Vendedor real con credenciales de PRUEBA → marcador test@testuser.com
   * - Cuenta test_user completa (sandbox) → Mercado Pago exige el patrón
   *   test_payer_[0-9]{1,10}@testuser.com (no acepta el marcador genérico)
   */
  private async resolveSandboxPayerEmailMode(
    accessToken: string,
  ): Promise<MpSandboxPayerEmailMode> {
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return 'testuser';

      const body = (await response.json()) as { tags?: string[] };
      const tags = Array.isArray(body.tags) ? body.tags : [];
      if (tags.includes('test_user')) {
        return 'synthetic';
      }
      return 'testuser';
    } catch {
      return 'testuser';
    }
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

  /**
   * Mercado Pago exige que sum(unit_price × quantity) === total_amount.
   * Usamos lineTotal (incluye impuesto por línea), envío y ajuste por descuento/redondeo.
   */
  private buildMercadoPagoOrderItems(order: {
    total: { toString(): string } | number;
    shippingAmount: { toString(): string } | number;
    items: Array<{
      productName: string;
      variantName: string | null;
      quantity: number;
      lineTotal: { toString(): string } | number;
    }>;
  }) {
    const targetTotal = Number(order.total);
    const lines: Array<{
      title: string;
      description: string;
      amount: number;
      quantity: number;
    }> = [];

    for (const item of order.items) {
      const lineTotal = Number(item.lineTotal);
      if (lineTotal <= 0) continue;
      lines.push({
        title: item.productName,
        description: item.variantName ?? item.productName,
        amount: lineTotal,
        quantity: item.quantity,
      });
    }

    const shipping = Number(order.shippingAmount);
    if (shipping > 0) {
      lines.push({
        title: 'Envío',
        description: 'Costo de envío',
        amount: shipping,
        quantity: 1,
      });
    }

    if (lines.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_ORDER_TOTAL',
        message: 'El pedido no tiene ítems para cobrar.',
      });
    }

    const amountSum = lines.reduce((sum, line) => sum + line.amount, 0);
    const ratio = amountSum > 0 ? targetTotal / amountSum : 1;

    const items = lines.map((line) => ({
      title: line.title,
      description: line.description,
      quantity: line.quantity,
      unit_price: ((line.amount * ratio) / line.quantity).toFixed(2),
    }));

    const itemsSum = items.reduce(
      (sum, item) => sum + Number(item.unit_price) * item.quantity,
      0,
    );
    const roundingDiff = Math.round((targetTotal - itemsSum) * 100) / 100;

    if (roundingDiff !== 0) {
      const last = items[items.length - 1]!;
      const adjustedUnit =
        Number(last.unit_price) + roundingDiff / last.quantity;
      last.unit_price = adjustedUnit.toFixed(2);
    }

    return items;
  }

  private resolvePayerIdentification(
    identification: ProcessMercadoPagoPaymentDto['payerIdentification'],
    isTestMode: boolean,
  ) {
    const type = identification?.type?.trim();
    const number = identification?.number?.trim();
    if (type && number) {
      return { type, number };
    }
    if (isTestMode) {
      return { type: 'DNI', number: '12345678' };
    }
    return null;
  }

  private parseMercadoPagoFailedOrder(error: unknown, isTestMode: boolean) {
    if (!error || typeof error !== 'object') return null;

    const body = error as {
      errors?: Array<{ code?: string; message?: string; details?: string[] }>;
      data?: MpOrderResponse;
    };

    const hasFailedTransaction = Boolean(
      body.errors?.some(
        (item) =>
          item.code === 'failed' ||
          item.message?.toLowerCase().includes('transactions failed'),
      ) || body.data?.status === 'failed',
    );

    if (!hasFailedTransaction || !body.data) return null;

    const payment = body.data.transactions?.payments?.[0];
    const statusDetail = this.extractMercadoPagoStatusDetail(error, payment);
    const userMessage = this.formatMercadoPagoStatusDetail(
      statusDetail,
      isTestMode,
    );

    return {
      mpResponse: body.data,
      statusDetail,
      userMessage,
    };
  }

  private extractMercadoPagoStatusDetail(
    error: unknown,
    payment?: { status_detail?: string },
  ) {
    if (payment?.status_detail) return payment.status_detail;

    if (!error || typeof error !== 'object') return '';

    const body = error as { errors?: Array<{ details?: string[] }> };
    for (const item of body.errors ?? []) {
      for (const detail of item.details ?? []) {
        const match = String(detail).match(/: ([a-z0-9_]+)$/i);
        if (match?.[1]) return match[1];
      }
    }

    return '';
  }

  private formatMercadoPagoStatusDetail(
    statusDetail: string,
    isTestMode: boolean,
  ) {
    const code = statusDetail.trim().toLowerCase();
    const messages: Record<string, string> = {
      bad_filled_card_data:
        'Revisa los datos de la tarjeta e intenta de nuevo.',
      insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
      required_call_for_authorize:
        'Debes autorizar el pago con tu banco.',
      card_disabled:
        'La tarjeta está deshabilitada para compras en línea.',
      cc_rejected_duplicated_payment:
        'Ya existe un pago similar. Espera unos minutos e intenta de nuevo.',
      invalid_installments:
        'El número de cuotas no es válido para esta tarjeta.',
      max_attempts_exceeded:
        'Se superó el máximo de intentos con esta tarjeta.',
      high_risk:
        'El pago fue rechazado por seguridad. Prueba con otro medio de pago.',
      cc_rejected_high_risk:
        'El pago fue rechazado por seguridad. Prueba con otro medio de pago.',
      cc_rejected_other_reason:
        'El banco rechazó el pago. Prueba con otra tarjeta.',
      cc_rejected_call_for_authorize:
        'Debes autorizar el pago con tu banco.',
      invalid_email_for_sandbox:
        'El formato del correo no es válido para pruebas en Mercado Pago (debe contener @testuser.com).',
      invalid_users_involved:
        'Combinación inválida entre el vendedor y el comprador de prueba. Revisa que el correo de pago corresponda al tipo de credenciales configuradas.',
    };

    let message =
      messages[code] ??
      (code
        ? `Pago rechazado (${code}).`
        : 'No pudimos procesar el pago. Verifica los datos e intenta de nuevo.');

    if (isTestMode && code !== 'invalid_users_involved') {
      message += ' En modo prueba: titular APRO, DNI 12345678.';
    }

    return message;
  }

  private resolveSandboxPayerEmail(
    orderId: string,
    email: string,
    isTestMode: boolean,
    mode: MpSandboxPayerEmailMode = 'testuser',
  ) {
    if (!isTestMode || mode === 'order') return email.trim();
    if (mode === 'synthetic') return this.buildSyntheticTestPayerEmail(orderId);
    return 'test@testuser.com';
  }

  private buildSyntheticTestPayerEmail(orderId: string) {
    let hash = 0;
    for (let i = 0; i < orderId.length; i += 1) {
      hash = (hash * 31 + orderId.charCodeAt(i)) % 10_000_000_000;
    }
    const digits = String(Math.abs(hash)).padStart(6, '0').slice(0, 10);
    return `test_payer_${digits}@testuser.com`;
  }

  private extractMercadoPagoError(error: unknown, isTestMode = false) {
    const fallback =
      'No pudimos procesar el pago con Mercado Pago. Verifica los datos e intenta de nuevo.';
    const details: string[] = [];
    const genericFailure = 'the following transactions failed';

    const pushStatusDetail = (code: string) => {
      if (!code) return;
      details.push(this.formatMercadoPagoStatusDetail(code, isTestMode));
    };

    const pushErrors = (errors: unknown) => {
      if (!Array.isArray(errors)) return;
      for (const item of errors) {
        if (!item || typeof item !== 'object') continue;
        const code = 'code' in item ? String(item.code) : '';
        const message = 'message' in item ? String(item.message) : '';
        const itemDetails =
          'details' in item && Array.isArray(item.details)
            ? item.details
            : [];

        for (const detail of itemDetails) {
          const match = String(detail).match(/: ([a-z0-9_]+)$/i);
          if (match?.[1]) pushStatusDetail(match[1]);
        }

        if (
          message &&
          !message.toLowerCase().includes(genericFailure)
        ) {
          details.push(message);
        }
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
      const body = error as {
        errors?: unknown;
        data?: MpOrderResponse;
        cause?: { errors?: unknown; message?: string };
      };

      pushErrors(body.errors);

      const payment = body.data?.transactions?.payments?.[0];
      if (payment?.status_detail) {
        pushStatusDetail(payment.status_detail);
      }

      if (body.cause && typeof body.cause === 'object') {
        pushErrors(body.cause.errors);
        if (body.cause.message) details.push(body.cause.message);
      }
      if (error instanceof Error && error.message) {
        if (!error.message.toLowerCase().includes(genericFailure)) {
          details.push(error.message);
        }
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
