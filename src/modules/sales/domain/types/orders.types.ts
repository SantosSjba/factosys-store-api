export type OrderItemRecord = {
  id: string;
  variantId: string | null;
  productId: string | null;
  sku: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: string;
  compareAtPrice: string | null;
  taxAmount: string;
  lineSubtotal: string;
  lineTotal: string;
  sortOrder: number;
};

export type CustomerSavedAddressRecord = OrderAddressRecord & {
  lastOrderNumber: string;
  lastUsedAt: Date;
};

export type OrderAddressRecord = {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  label: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  country: string;
  postalCode: string | null;
};

export type OrderStatusHistoryRecord = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  fromPaymentStatus: string | null;
  toPaymentStatus: string | null;
  note: string | null;
  performedById: string | null;
  performedByName: string | null;
  createdAt: Date;
};

export type OrderSummaryRecord = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  source: string;
  deliveryMethod: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  currencyCode: string;
  total: string;
  itemCount: number;
  warehouseName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDetailRecord = OrderSummaryRecord & {
  guestEmail: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestPhone: string | null;
  warehouseId: string | null;
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  discountAmount: string;
  taxRateId: string | null;
  taxRateName: string | null;
  taxRatePercent: string | null;
  pricesIncludeTax: boolean;
  internalNotes: string | null;
  customerNotes: string | null;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  paidAt: Date | null;
  cancelReason: string | null;
  createdById: string | null;
  createdByName: string | null;
  items: OrderItemRecord[];
  addresses: OrderAddressRecord[];
  statusHistory: OrderStatusHistoryRecord[];
};
