import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const STORE_SETTINGS_ID = 'default';

const storeSettingsInclude = {
  defaultTaxRate: true,
  defaultWarehouse: true,
} satisfies Prisma.StoreSettingsInclude;

@Injectable()
export class PrismaStoreSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate() {
    return this.prisma.storeSettings.upsert({
      where: { id: STORE_SETTINGS_ID },
      update: {},
      create: { id: STORE_SETTINGS_ID },
      include: storeSettingsInclude,
    });
  }

  update(data: Prisma.StoreSettingsUpdateInput) {
    return this.prisma.storeSettings.update({
      where: { id: STORE_SETTINGS_ID },
      data,
      include: storeSettingsInclude,
    });
  }
}

export { STORE_SETTINGS_ID, storeSettingsInclude };
