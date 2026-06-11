import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import type { StoreActor } from '../types/store-actor.type';

const GUEST_CART_HEADER = 'x-guest-cart-token';

type StoreActorRequest = {
  user?: AuthenticatedUser | null;
  storeActor?: StoreActor;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class StoreActorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StoreActorRequest>();

    if (request.user?.userType === 'CUSTOMER') {
      request.storeActor = {
        kind: 'customer',
        userId: request.user.id,
      };
      return true;
    }

    const guestToken = this.readGuestToken(request);
    if (!guestToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Inicia sesión o continúa como invitado.',
      });
    }

    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { guestCheckoutEnabled: true },
    });

    if (!settings?.guestCheckoutEnabled) {
      throw new ForbiddenException({
        code: 'GUEST_CHECKOUT_DISABLED',
        message: 'El checkout como invitado no está habilitado.',
      });
    }

    request.storeActor = {
      kind: 'guest',
      guestToken,
    };

    return true;
  }

  private readGuestToken(request: StoreActorRequest) {
    const raw = request.headers[GUEST_CART_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const token = value?.trim();
    return token || null;
  }
}
