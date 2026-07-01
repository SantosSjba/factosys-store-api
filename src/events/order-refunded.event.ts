export class OrderRefundedEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currencyCode: string,
    public readonly isFullRefund: boolean,
    public readonly note?: string | null,
  ) {}
}
