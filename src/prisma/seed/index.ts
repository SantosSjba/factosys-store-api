import { disconnectSeedClient } from './client';
import { seedCatalog } from './seeders/catalog.seeder';
import { seedInventory } from './seeders/inventory.seeder';
import { seedPermissions } from './seeders/permissions.seeder';
import { seedRoles } from './seeders/roles.seeder';
import { seedUsers, syncAdminRolePermissions } from './seeders/users.seeder';

async function main(): Promise<void> {
  console.log('→ Sembrando permisos...');
  await seedPermissions();

  console.log('→ Sembrando roles y asignación de permisos...');
  await seedRoles();
  await syncAdminRolePermissions();

  console.log('→ Sembrando usuarios...');
  const users = await seedUsers();

  console.log('→ Sembrando catálogo...');
  const catalogLines = await seedCatalog();

  console.log('→ Sembrando inventario...');
  const inventoryLines = await seedInventory();

  console.log('Seed completado.');
  for (const line of users) {
    console.log(`  • ${line}`);
  }
  for (const line of catalogLines) {
    console.log(`  • ${line}`);
  }
  for (const line of inventoryLines) {
    console.log(`  • ${line}`);
  }
  console.log(
    '  • super: todos los roles del sistema (incluye admin con todos los permisos)',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeedClient();
  });
