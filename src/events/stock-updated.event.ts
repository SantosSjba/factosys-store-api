export class StockUpdatedEvent {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
  ) {}
}
