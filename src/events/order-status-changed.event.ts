export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly note?: string | null,
  ) {}
}
