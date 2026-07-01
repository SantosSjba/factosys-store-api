export class OrderRefundGatewayEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
    public readonly isFullRefund: boolean,
  ) {}
}
