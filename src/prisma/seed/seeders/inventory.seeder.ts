import { seedPrisma } from '../client';

export async function seedInventory(): Promise<string[]> {
  const warehouse = await seedPrisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {
      name: 'Almacén principal',
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
    create: {
      name: 'Almacén principal',
      code: 'MAIN',
      description: 'Bodega predeterminada del sistema',
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  });

  return [`Almacén: ${warehouse.name} (${warehouse.code})`];
}
