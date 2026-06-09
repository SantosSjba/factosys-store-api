import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import {
  PaymentGatewayProvider,
  PaymentTransactionStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { UpdatePaymentGatewayDto } from './payment-gateway.dto';

@Injectable()
export class PaymentGatewaysService {
  constructor(private readonly prisma: PrismaService) {}

  async listGateways() {
    const gateways = await this.prisma.paymentGatewayConfig.findMany({
      orderBy: { displayName: 'asc' },
    });
    return gateways.map((g) => this.mapGateway(g, false));
  }

  async updateGateway(
    provider: PaymentGatewayProvider,
    dto: UpdatePaymentGatewayDto,
  ) {
    const existing = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'GATEWAY_NOT_FOUND',
        message: 'Pasarela no encontrada.',
      });
    }

    const updated = await this.prisma.paymentGatewayConfig.update({
      where: { provider },
      data: {
        displayName: dto.displayName?.trim(),
        isEnabled: dto.isEnabled,
        isTestMode: dto.isTestMode,
        publicKey:
          dto.publicKey === undefined
            ? undefined
            : dto.publicKey?.trim() || null,
        secretKey:
          dto.secretKey === undefined
            ? undefined
            : dto.secretKey?.trim() || null,
        webhookSecret:
          dto.webhookSecret === undefined
            ? undefined
            : dto.webhookSecret?.trim() || null,
        config: dto.config as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapGateway(updated, false);
  }

  async listTransactions(orderId?: string) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: orderId ? { orderId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: orderId ? 50 : 100,
      include: {
        order: {
          select: { orderNumber: true, total: true, currencyCode: true },
        },
      },
    });

    return transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      orderNumber: t.order.orderNumber,
      provider: t.provider,
      externalId: t.externalId,
      amount: t.amount.toString(),
      currencyCode: t.currencyCode,
      status: t.status,
      metadata: t.metadata,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async handleWebhook(
    provider: PaymentGatewayProvider,
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    const gateway = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });

    if (!gateway?.isEnabled) {
      throw new BadRequestException({
        code: 'GATEWAY_DISABLED',
        message: 'Pasarela deshabilitada.',
      });
    }

    if (gateway.webhookSecret && signature !== gateway.webhookSecret) {
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Firma de webhook inválida.',
      });
    }

    const orderId = this.readWebhookString(payload.orderId ?? payload.order_id);
    const externalId = this.readWebhookString(
      payload.externalId ?? payload.id ?? payload.charge_id,
    );
    const amount = Number(payload.amount ?? 0);

    if (!orderId) {
      return { received: true, processed: false, reason: 'missing_order_id' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return { received: true, processed: false, reason: 'order_not_found' };
    }

    const status =
      payload.status === 'failed'
        ? PaymentTransactionStatus.FAILED
        : PaymentTransactionStatus.COMPLETED;

    const existing = externalId
      ? await this.prisma.paymentTransaction.findFirst({
          where: { provider, externalId },
        })
      : null;

    if (existing) {
      await this.prisma.paymentTransaction.update({
        where: { id: existing.id },
        data: { status, metadata: payload as Prisma.InputJsonValue },
      });
    } else {
      await this.prisma.paymentTransaction.create({
        data: {
          orderId,
          provider,
          externalId: externalId || null,
          amount: amount || Number(order.total),
          currencyCode: order.currencyCode,
          status,
          metadata: payload as Prisma.InputJsonValue,
        },
      });
    }

    return { received: true, processed: true, orderId, status };
  }

  private readWebhookString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private mapGateway(
    gateway: {
      id: string;
      provider: PaymentGatewayProvider;
      displayName: string;
      isEnabled: boolean;
      isTestMode: boolean;
      publicKey: string | null;
      secretKey: string | null;
      webhookSecret: string | null;
      config: unknown;
      updatedAt: Date;
    },
    includeSecrets: boolean,
  ) {
    return {
      id: gateway.id,
      provider: gateway.provider,
      displayName: gateway.displayName,
      isEnabled: gateway.isEnabled,
      isTestMode: gateway.isTestMode,
      publicKey: gateway.publicKey,
      secretKey: includeSecrets
        ? gateway.secretKey
        : gateway.secretKey
          ? '••••••••'
          : null,
      webhookSecret: includeSecrets
        ? gateway.webhookSecret
        : gateway.webhookSecret
          ? '••••••••'
          : null,
      config: gateway.config,
      updatedAt: gateway.updatedAt,
    };
  }
}
