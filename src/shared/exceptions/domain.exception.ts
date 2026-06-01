export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code = 'DOMAIN_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
