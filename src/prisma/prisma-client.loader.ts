export interface PrismaClientLike {
  [key: string]: unknown;
}

let prismaClient: PrismaClientLike | null = null;

export function getPrismaClient(): PrismaClientLike {
  prismaClient ??= {};
  return prismaClient;
}
