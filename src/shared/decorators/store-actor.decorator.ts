import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { StoreActor } from '../types/store-actor.type';

type StoreActorRequest = {
  storeActor?: StoreActor;
};

export const StoreActorParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StoreActor => {
    const request = context.switchToHttp().getRequest<StoreActorRequest>();

    if (!request.storeActor) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'No se pudo identificar la sesión de la tienda.',
      });
    }

    return request.storeActor;
  },
);
