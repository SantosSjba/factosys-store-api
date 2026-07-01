import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderAddressType,
  OrderDeliveryMethod,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderSource,
  PaymentGatewayProvider,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { MercadoPagoService } from '../../../../payments/mercadopago/mercadopago.service';
import { CouponsService } from '../../../../marketing/coupons/application/services/coupons.service';
import { ShippingZonesService } from '../../../../settings/shipping-zones/shipping-zones.service';
import { CreateOrderDto } from '../../../application/dto/create-order.dto';
import { OrdersService } from '../../../application/services/orders.service';
import type { StoreActor } from '../../../../../shared/types/store-actor.type';
import { CartService } from '../../../carts/application/services/cart.service';
import { StoreCheckoutQuoteDto } from '../dto/store-checkout-quote.dto';
import { StorePlaceOrderDto } from '../dto/store-place-order.dto';

const SETTINGS_CACHE_MS = 30_000;

type StoreContext = {
  warehouseId: string;
  currencyCode: string;
  minOrderAmount: number | null;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  flatShippingFee: number | null;
};

type QuoteLine = {
  variantId: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  taxAmount: number;
  lineTotal: number;
  availableQuantity: number;
};

@Injectable()
export class StoreCheckoutService {
  private settingsCache:
    | {
        expiresAt: number;
        value: Awaited<ReturnType<StoreCheckoutService['loadSettings']>>;
      }
    | null = null;

  constructor(
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly couponsService: CouponsService,
    private readonly shippingZonesService: ShippingZonesService,
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  async getSettings() {
    const { settings, tax } = await this.loadSettingsCached();
    const mercadoPagoGateway =
      await this.prisma.paymentGatewayConfig.findUnique({
        where: { provider: PaymentGatewayProvider.MERCADO_PAGO },
        select: { isEnabled: true, publicKey: true, isTestMode: true },
      });
    const mercadoPagoEnabled = Boolean(
      mercadoPagoGateway?.isEnabled && mercadoPagoGateway.publicKey,
    );
    const mercadoPagoAccepted = mercadoPagoEnabled
      ? await this.mercadoPagoService.getAcceptedMethodsSummary()
      : { methods: [] as const };

    return {
      guestCheckoutEnabled: settings.guestCheckoutEnabled,
      minOrderAmount: this.decimalToNumber(settings.minOrderAmount),
      freeShippingMinAmount: this.decimalToNumber(
        settings.freeShippingMinAmount,
      ),
      flatShippingFee: this.decimalToNumber(settings.flatShippingFee),
      handlingDaysMin: settings.handlingDaysMin,
      handlingDaysMax: settings.handlingDaysMax,
      currencyCode: settings.defaultCurrencyCode,
      tax: tax
        ? {
            name: tax.name,
            rate: tax.rate.toString(),
            pricesIncludeTax: settings.pricesIncludeTax,
          }
        : null,
      pickup: {
        name: settings.pickupPointName,
        address: settings.pickupPointAddress,
        district: settings.pickupPointDistrict,
        province: settings.pickupPointProvince,
        department: settings.pickupPointDepartment,
        hours: settings.pickupPointHours,
        phone: settings.pickupPointPhone,
      },
      payments: {
        cash: settings.paymentCashEnabled,
        bankTransfer: {
          enabled: settings.paymentBankTransferEnabled,
          instructions: settings.bankTransferInstructions,
        },
        yape: {
          enabled: settings.paymentYapeEnabled,
          number: settings.yapeNumber,
        },
        plin: {
          enabled: settings.paymentPlinEnabled,
          number: settings.plinNumber,
        },
        gateway: {
          mercadoPago: mercadoPagoEnabled,
          isTestMode: mercadoPagoGateway?.isTestMode ?? false,
          acceptedMethods: mercadoPagoAccepted.methods,
        },
      },
    };
  }

  async quote(actor: StoreActor, dto: StoreCheckoutQuoteDto) {
    const [cart, context] = await Promise.all([
      this.cartService.getCart(actor),
      this.resolveStoreContext(),
    ]);

    if (cart.items.length === 0) {
      throw new BadRequestException({
        code: 'CART_EMPTY',
        message: 'Tu carrito está vacío.',
      });
    }

    const lines = await this.buildQuoteLines(cart.items, context);
    const stockIssues = lines
      .filter((line) => line.quantity > line.availableQuantity)
      .map((line) => ({
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        requestedQuantity: line.quantity,
        availableQuantity: line.availableQuantity,
      }));

    const subtotal = this.sum(lines.map((line) => line.lineSubtotal));
    const taxAmount = this.sum(lines.map((line) => line.taxAmount));
    const shipping = await this.resolveShippingAmount(dto, subtotal, context);
    const discount = await this.resolveDiscount(dto.couponCode, subtotal);
    const total = subtotal + taxAmount + shipping.amount - discount.amount;

    if (context.minOrderAmount != null && total < context.minOrderAmount) {
      throw new BadRequestException({
        code: 'MIN_ORDER_AMOUNT_NOT_MET',
        message: `El monto mínimo de pedido es ${context.minOrderAmount.toFixed(2)} ${context.currencyCode}.`,
      });
    }

    return {
      deliveryMethod: dto.deliveryMethod,
      currencyCode: context.currencyCode,
      itemCount: cart.itemCount,
      lines: lines.map((line) => ({
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineSubtotal: line.lineSubtotal,
        availableQuantity: line.availableQuantity,
      })),
      subtotal,
      taxAmount,
      shippingAmount: shipping.amount,
      shippingZoneName: shipping.zoneName,
      isFreeShipping: shipping.isFreeShipping,
      discountAmount: discount.amount,
      couponCode: discount.couponCode,
      total,
      stockIssues,
      canPlaceOrder: stockIssues.length === 0,
    };
  }

  async placeOrder(actor: StoreActor, dto: StorePlaceOrderDto) {
    this.assertShippingAddress(dto);
    await this.assertPaymentMethodEnabled(dto.paymentMethod);

    const quote = await this.quote(actor, dto);

    if (!quote.canPlaceOrder) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_AVAILABLE_STOCK',
        message:
          'Uno o más productos ya no tienen stock suficiente. Ajusta tu carrito e intenta de nuevo.',
        details: quote.stockIssues,
      });
    }

    const createDto = await this.buildCreateOrderDto(actor, dto, quote);
    const order = await this.ordersService.createOrder(createDto, undefined, {
      storeResponse: true,
    });
    await this.cartService.clearCart(actor);

    return order;
  }

  private async buildCreateOrderDto(
    actor: StoreActor,
    dto: StorePlaceOrderDto,
    quote: Awaited<ReturnType<StoreCheckoutService['quote']>>,
  ): Promise<CreateOrderDto> {
    const base: CreateOrderDto = {
      items: quote.lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
      })),
      deliveryMethod: dto.deliveryMethod,
      shippingAmount: quote.shippingAmount,
      discountAmount: quote.discountAmount,
      couponCode: quote.couponCode ?? undefined,
      customerNotes: dto.customerNotes,
      paymentStatus: OrderPaymentStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      source: OrderSource.WEB,
      reserveStock: true,
      creationNote: 'Pedido creado desde la tienda web.',
    };

    if (actor.kind === 'guest') {
      this.assertGuestContact(dto);
      const guest = dto.guestContact!;

      return {
        ...base,
        guestEmail: guest.email,
        guestFirstName: guest.firstName,
        guestLastName: guest.lastName,
        guestPhone: guest.phone,
        addresses: this.buildShippingAddresses(dto, {
          email: guest.email,
          firstName: guest.firstName ?? null,
          lastName: guest.lastName ?? null,
          phone: guest.phone ?? null,
        }),
      };
    }

    const customer = await this.prisma.user.findFirst({
      where: { id: actor.userId, userType: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }

    return {
      ...base,
      customerId: customer.id,
      addresses: this.buildShippingAddresses(dto, customer),
    };
  }

  private buildShippingAddresses(
    dto: StorePlaceOrderDto,
    contact: {
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    },
  ) {
    if (
      dto.deliveryMethod !== OrderDeliveryMethod.SHIPPING ||
      !dto.shippingAddress
    ) {
      return undefined;
    }

    return [
      {
        type: OrderAddressType.SHIPPING,
        firstName:
          dto.shippingAddress.firstName?.trim() ||
          contact.firstName ||
          undefined,
        lastName:
          dto.shippingAddress.lastName?.trim() ||
          contact.lastName ||
          undefined,
        phone:
          dto.shippingAddress.phone?.trim() || contact.phone || undefined,
        email: contact.email,
        addressLine1: dto.shippingAddress.addressLine1,
        addressLine2: dto.shippingAddress.addressLine2,
        district: dto.shippingAddress.district,
        province: dto.shippingAddress.province,
        department: dto.shippingAddress.department,
        country: dto.shippingAddress.country?.trim().toUpperCase() ?? 'PE',
      },
    ];
  }

  private assertGuestContact(dto: StorePlaceOrderDto) {
    const guest = dto.guestContact;
    if (!guest?.email?.trim()) {
      throw new BadRequestException({
        code: 'GUEST_CONTACT_REQUIRED',
        message: 'Ingresa tu correo para continuar como invitado.',
      });
    }
  }

  private assertShippingAddress(dto: StorePlaceOrderDto) {
    if (dto.deliveryMethod !== OrderDeliveryMethod.SHIPPING) return;

    const address = dto.shippingAddress;
    if (!address?.addressLine1?.trim()) {
      throw new BadRequestException({
        code: 'SHIPPING_ADDRESS_REQUIRED',
        message: 'Ingresa la dirección de envío.',
      });
    }

    if (
      !address.district?.trim() ||
      !address.province?.trim() ||
      !address.department?.trim()
    ) {
      throw new BadRequestException({
        code: 'SHIPPING_ADDRESS_INCOMPLETE',
        message: 'Completa distrito, provincia y departamento para el envío.',
      });
    }
  }

  private async assertPaymentMethodEnabled(method: OrderPaymentMethod) {
    const settings = await this.getSettings();
    const enabledMap: Record<OrderPaymentMethod, boolean> = {
      [OrderPaymentMethod.CASH]: settings.payments.cash,
      [OrderPaymentMethod.BANK_TRANSFER]:
        settings.payments.bankTransfer.enabled,
      [OrderPaymentMethod.YAPE]: settings.payments.yape.enabled,
      [OrderPaymentMethod.PLIN]: settings.payments.plin.enabled,
      [OrderPaymentMethod.CARD]: false,
      [OrderPaymentMethod.GATEWAY]: settings.payments.gateway.mercadoPago,
    };

    if (!enabledMap[method]) {
      throw new BadRequestException({
        code: 'PAYMENT_METHOD_NOT_AVAILABLE',
        message: 'El método de pago seleccionado no está disponible.',
      });
    }
  }

  private async buildQuoteLines(
    items: Array<{
      variantId: string;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      availableQuantity?: number;
    }>,
    context: StoreContext,
  ): Promise<QuoteLine[]> {
    const availability = await this.loadAvailability(
      context.warehouseId,
      items.map((item) => item.variantId),
    );

    return items.map((item) => {
      const gross = item.unitPrice * item.quantity;
      let lineSubtotal = gross;
      let taxAmount = 0;

      if (context.taxRatePercent > 0) {
        if (context.pricesIncludeTax) {
          lineSubtotal = gross / (1 + context.taxRatePercent / 100);
          taxAmount = gross - lineSubtotal;
        } else {
          taxAmount = lineSubtotal * (context.taxRatePercent / 100);
        }
      }

      const lineTotal = context.pricesIncludeTax
        ? gross
        : lineSubtotal + taxAmount;

      return {
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal,
        taxAmount,
        lineTotal,
        availableQuantity: availability.get(item.variantId) ?? 0,
      };
    });
  }

  private async loadAvailability(warehouseId: string, variantIds: string[]) {
    const uniqueIds = [...new Set(variantIds)];
    const levels = await this.prisma.stockLevel.findMany({
      where: {
        warehouseId,
        variantId: { in: uniqueIds },
      },
      select: {
        variantId: true,
        quantityOnHand: true,
        quantityReserved: true,
      },
    });

    return new Map(
      uniqueIds.map((variantId) => {
        const level = levels.find((entry) => entry.variantId === variantId);
        const available = level
          ? Math.max(0, level.quantityOnHand - level.quantityReserved)
          : 0;
        return [variantId, available] as const;
      }),
    );
  }

  private async resolveShippingAmount(
    dto: StoreCheckoutQuoteDto,
    subtotal: number,
    context: StoreContext,
  ) {
    if (dto.deliveryMethod === OrderDeliveryMethod.PICKUP) {
      return { amount: 0, zoneName: null, isFreeShipping: false };
    }

    if (!dto.department?.trim() || !dto.province?.trim()) {
      return {
        amount: context.flatShippingFee ?? 0,
        zoneName: null,
        isFreeShipping: false,
      };
    }

    const result = await this.shippingZonesService.calculateShippingFee({
      department: dto.department,
      province: dto.province,
      subtotal,
      fallbackFee: context.flatShippingFee ?? 0,
    });

    return {
      amount: result.fee,
      zoneName: result.zoneName,
      isFreeShipping: result.isFreeShipping,
    };
  }

  private async resolveDiscount(
    couponCode: string | undefined,
    subtotal: number,
  ) {
    if (!couponCode?.trim()) {
      return { amount: 0, couponCode: null as string | null };
    }

    const quote = await this.couponsService.resolveDiscount(
      couponCode.trim(),
      subtotal,
    );

    return {
      amount: quote.discountAmount,
      couponCode: couponCode.trim(),
    };
  }

  private async loadSettingsCached() {
    if (this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return this.settingsCache.value;
    }

    const value = await this.loadSettings();
    this.settingsCache = {
      expiresAt: Date.now() + SETTINGS_CACHE_MS,
      value,
    };

    return value;
  }

  private async loadSettings() {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'default' },
      include: { defaultTaxRate: true, defaultWarehouse: true },
    });

    if (!settings) {
      throw new BadRequestException({
        code: 'STORE_SETTINGS_NOT_FOUND',
        message: 'Configura la tienda antes de procesar pedidos.',
      });
    }

    return {
      settings,
      tax: settings.defaultTaxRate,
    };
  }

  private async resolveStoreContext(): Promise<StoreContext> {
    const { settings } = await this.loadSettingsCached();
    const warehouse = settings.defaultWarehouse;
    if (!warehouse?.isActive) {
      throw new BadRequestException({
        code: 'WAREHOUSE_NOT_CONFIGURED',
        message: 'La tienda no tiene un almacén activo configurado.',
      });
    }

    const tax = settings.defaultTaxRate;

    return {
      warehouseId: warehouse.id,
      currencyCode: settings.defaultCurrencyCode,
      minOrderAmount: this.decimalToNumber(settings.minOrderAmount),
      taxRatePercent: tax ? Number(tax.rate) : 0,
      pricesIncludeTax: settings.pricesIncludeTax,
      flatShippingFee: this.decimalToNumber(settings.flatShippingFee),
    };
  }

  private decimalToNumber(value: { toString(): string } | null | undefined) {
    return value != null ? Number(value) : null;
  }

  private sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }
}
