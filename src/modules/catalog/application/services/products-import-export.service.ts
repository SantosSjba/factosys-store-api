import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductStatus, ProductType } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ProductsImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportProductsCsv() {
    const products = await this.prisma.product.findMany({
      include: {
        brand: true,
        primaryCategory: true,
        variants: { where: { isDefault: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
      take: 10000,
    });

    const headers = [
      'sku',
      'nombre',
      'slug',
      'tipo',
      'estado',
      'marca',
      'categoria',
      'precio',
      'costo',
      'stock',
      'descripcion',
    ];

    const rows = await Promise.all(
      products.map(async (product) => {
        const variant = product.variants[0];
        let stock = 0;
        if (variant) {
          const levels = await this.prisma.stockLevel.aggregate({
            where: { variantId: variant.id },
            _sum: { quantityOnHand: true },
          });
          stock = levels._sum.quantityOnHand ?? 0;
        }

        return [
          variant?.sku ?? '',
          product.name,
          product.slug,
          product.productType,
          product.status,
          product.brand?.name ?? '',
          product.primaryCategory?.name ?? '',
          variant?.price.toString() ?? '0',
          variant?.cost?.toString() ?? '',
          String(stock),
          product.description ?? '',
        ];
      }),
    );

    return this.toCsv([headers, ...rows]);
  }

  async importProductsCsv(csvContent: string, staffUserId?: string) {
    const lines = csvContent
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new BadRequestException({
        code: 'CSV_EMPTY',
        message: 'El archivo CSV está vacío.',
      });
    }

    const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const required = ['sku', 'nombre'];
    for (const field of required) {
      if (!headers.includes(field)) {
        throw new BadRequestException({
          code: 'CSV_INVALID_HEADERS',
          message: `Falta columna requerida: ${field}`,
        });
      }
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const row = Object.fromEntries(
        headers.map((h, idx) => [h, cols[idx] ?? '']),
      );

      const sku = row.sku?.trim();
      const name = row.nombre?.trim();
      if (!sku || !name) {
        errors.push(`Fila ${i + 1}: SKU y nombre requeridos`);
        continue;
      }

      try {
        const existingVariant = await this.prisma.productVariant.findUnique({
          where: { sku },
          include: { product: true },
        });

        const price = Number(row.precio || 0);
        const cost = row.costo ? Number(row.costo) : null;
        const stockQty = Number(row.stock || 0);

        if (existingVariant) {
          await this.prisma.product.update({
            where: { id: existingVariant.productId },
            data: {
              name,
              description: row.descripcion?.trim() || undefined,
              status:
                (row.estado?.trim().toUpperCase() as ProductStatus) ||
                undefined,
            },
          });
          await this.prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              price,
              cost,
            },
          });
          updated++;
        } else {
          const category = row.categoria?.trim()
            ? await this.prisma.category.findFirst({
                where: {
                  name: { equals: row.categoria.trim(), mode: 'insensitive' },
                },
              })
            : await this.prisma.category.findFirst({
                where: { isActive: true },
              });

          if (!category) {
            errors.push(
              `Fila ${i + 1}: No hay categoría disponible para crear el producto`,
            );
            continue;
          }

          const brand = row.marca?.trim()
            ? await this.prisma.brand.findFirst({
                where: {
                  name: { equals: row.marca.trim(), mode: 'insensitive' },
                },
              })
            : null;

          const slug = this.slugify(row.slug?.trim() || name);
          const product = await this.prisma.product.create({
            data: {
              name,
              slug: await this.uniqueSlug(slug),
              description: row.descripcion?.trim() || null,
              productType: ProductType.SIMPLE,
              status:
                (row.estado?.trim().toUpperCase() as ProductStatus) ||
                ProductStatus.DRAFT,
              primaryCategoryId: category.id,
              brandId: brand?.id,
              variants: {
                create: {
                  sku,
                  price,
                  cost,
                  isDefault: true,
                },
              },
            },
            include: { variants: true },
          });

          if (stockQty > 0) {
            const settings = await this.prisma.storeSettings.findFirst();
            const warehouseId = settings?.defaultWarehouseId;
            const variantId = product.variants[0]?.id;
            if (warehouseId && variantId) {
              const existing = await this.prisma.stockLevel.findUnique({
                where: { warehouseId_variantId: { variantId, warehouseId } },
              });
              const nextQty = (existing?.quantityOnHand ?? 0) + stockQty;
              await this.prisma.stockLevel.upsert({
                where: { warehouseId_variantId: { variantId, warehouseId } },
                create: { variantId, warehouseId, quantityOnHand: stockQty },
                update: { quantityOnHand: nextQty },
              });
            }
          }
          created++;
        }
      } catch (error) {
        errors.push(
          `Fila ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        );
      }
    }

    return { created, updated, errors };
  }

  private toCsv(rows: string[][]) {
    const body = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    return `\uFEFF${body}`;
  }

  private parseCsvLine(line: string) {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    let counter = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }
}
