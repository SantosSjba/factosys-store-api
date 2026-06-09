import {
  AttributeDataType,
  AttributeScope,
  ProductStatus,
  ProductType,
} from '../../../generated/prisma/client';
import { seedPrisma } from '../client';
import {
  CATALOG_ATTRIBUTE_SEED,
  CATALOG_BRAND_SEED,
  CATALOG_CATEGORY_SEED,
} from '../data/catalog.data';

export async function seedCatalog(): Promise<string[]> {
  const prisma = seedPrisma;
  const lines: string[] = [];

  const categoryIds = new Map<string, string>();
  for (const category of CATALOG_CATEGORY_SEED) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
    categoryIds.set(category.key, record.id);
  }

  for (const category of CATALOG_CATEGORY_SEED) {
    if (!('parentKey' in category) || !category.parentKey) continue;

    const parentId = categoryIds.get(category.parentKey);
    const categoryId = categoryIds.get(category.key);
    if (!parentId || !categoryId) continue;

    await prisma.category.update({
      where: { id: categoryId },
      data: { parentId },
    });
  }

  const brandIds = new Map<string, string>();
  for (const brand of CATALOG_BRAND_SEED) {
    const record = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, isActive: true },
      create: { name: brand.name, slug: brand.slug, isActive: true },
    });
    brandIds.set(brand.slug, record.id);
  }

  const attributeIds = new Map<string, string>();
  for (const attribute of CATALOG_ATTRIBUTE_SEED) {
    const record = await prisma.attribute.upsert({
      where: { slug: attribute.slug },
      update: {
        name: attribute.name,
        dataType: attribute.dataType,
        scope: attribute.scope,
        options: [...attribute.options],
        unit: attribute.unit,
        isFilterable: attribute.isFilterable,
      },
      create: {
        name: attribute.name,
        slug: attribute.slug,
        dataType: attribute.dataType,
        scope: attribute.scope,
        options: [...attribute.options],
        unit: attribute.unit,
        isFilterable: attribute.isFilterable,
      },
    });
    attributeIds.set(attribute.key, record.id);
  }

  const ramCategoryId = categoryIds.get('memoria-ram');
  const laptopCategoryId = categoryIds.get('computadoras');
  if (ramCategoryId) {
    const ramAttributes = ['tipo-memoria', 'capacidad-gb', 'frecuencia-mhz']
      .map((key) => attributeIds.get(key))
      .filter(Boolean) as string[];

    await prisma.categoryAttribute.deleteMany({
      where: { categoryId: ramCategoryId },
    });
    await prisma.categoryAttribute.createMany({
      data: ramAttributes.map((attributeId, index) => ({
        categoryId: ramCategoryId,
        attributeId,
        sortOrder: index,
      })),
    });
  }

  const kingstonId = brandIds.get('kingston');
  const asusId = brandIds.get('asus');

  if (ramCategoryId && kingstonId) {
    const product = await prisma.product.upsert({
      where: { slug: 'kingston-fury-beast-ddr5-16gb' },
      update: {},
      create: {
        name: 'Kingston Fury Beast DDR5 16GB',
        slug: 'kingston-fury-beast-ddr5-16gb',
        shortDescription:
          'Memoria DDR5 de alto rendimiento para gaming y productividad.',
        description:
          'Módulo Kingston Fury Beast DDR5 16GB ideal para actualizar tu PC con mayor ancho de banda y eficiencia energética.',
        brandId: kingstonId,
        primaryCategoryId: ramCategoryId,
        productType: ProductType.SIMPLE,
        status: ProductStatus.ACTIVE,
        tags: ['ram', 'ddr5', 'kingston', 'componentes'],
        publishedAt: new Date(),
        attributeValues: {
          create: [
            {
              attributeId: attributeIds.get('tipo-memoria')!,
              value: 'DDR5',
            },
            {
              attributeId: attributeIds.get('capacidad-gb')!,
              value: '16',
            },
            {
              attributeId: attributeIds.get('frecuencia-mhz')!,
              value: '5200',
            },
          ],
        },
        variants: {
          create: [
            {
              sku: 'KSM-DDR5-16-5200',
              name: '16GB / 5200MHz',
              price: 289.9,
              compareAtPrice: 329.9,
              isDefault: true,
              isActive: true,
              sortOrder: 0,
            },
          ],
        },
      },
      include: { variants: true },
    });

    lines.push(`Producto seed: ${product.name}`);
  }

  if (laptopCategoryId && asusId) {
    const product = await prisma.product.upsert({
      where: { slug: 'asus-vivobook-15-i7' },
      update: {},
      create: {
        name: 'ASUS VivoBook 15 Intel Core i7',
        slug: 'asus-vivobook-15-i7',
        shortDescription:
          'Laptop delgada con Intel Core i7 para trabajo y estudio.',
        description:
          'ASUS VivoBook 15 con procesador Intel Core i7, ideal para multitarea, estudiantes y oficina.',
        brandId: asusId,
        primaryCategoryId: laptopCategoryId,
        productType: ProductType.SIMPLE,
        status: ProductStatus.ACTIVE,
        tags: ['laptop', 'asus', 'intel', 'computadoras'],
        publishedAt: new Date(),
        variants: {
          create: [
            {
              sku: 'ASUS-VB15-I7-512',
              name: '16GB RAM / 512GB SSD',
              price: 3499,
              compareAtPrice: 3899,
              isDefault: true,
              isActive: true,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    lines.push(`Producto seed: ${product.name}`);
  }

  lines.push(
    `Categorías: ${CATALOG_CATEGORY_SEED.length}, marcas: ${CATALOG_BRAND_SEED.length}, atributos: ${CATALOG_ATTRIBUTE_SEED.length}`,
  );

  return lines;
}
