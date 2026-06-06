import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { ensureUniqueSlug } from '../../../../shared/helpers/slug.helper';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import { PrismaAttributeRepository } from '../../infrastructure/repositories/prisma-attribute.repository';
import { CreateAttributeDto } from '../dto/create-attribute.dto';
import { UpdateAttributeDto } from '../dto/update-attribute.dto';

@Injectable()
export class AttributesService {
  constructor(private readonly attributeRepository: PrismaAttributeRepository) {}

  async listAttributes(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.attributeRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((attribute) => this.mapAttribute(attribute)),
      total,
    );
  }

  async getAttribute(id: string) {
    const attribute = await this.attributeRepository.findById(id);
    if (!attribute) {
      throw new NotFoundException({
        code: 'ATTRIBUTE_NOT_FOUND',
        message: 'Atributo no encontrado.',
      });
    }

    return this.mapAttribute(attribute);
  }

  async createAttribute(dto: CreateAttributeDto) {
    const slug = await ensureUniqueSlug(dto.slug ?? dto.name, async (value) =>
      Boolean(await this.attributeRepository.findBySlug(value)),
    );

    const attribute = await this.attributeRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() ?? null,
      dataType: dto.dataType,
      unit: dto.unit?.trim() ?? null,
      scope: dto.scope,
      options: dto.options ?? [],
      isFilterable: dto.isFilterable ?? false,
      isRequired: dto.isRequired ?? false,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.mapAttribute(attribute);
  }

  async updateAttribute(id: string, dto: UpdateAttributeDto) {
    const existing = await this.attributeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'ATTRIBUTE_NOT_FOUND',
        message: 'Atributo no encontrado.',
      });
    }

    let slug = existing.slug;
    if (dto.slug || dto.name) {
      slug = await ensureUniqueSlug(
        dto.slug ?? dto.name ?? existing.name,
        async (value) => {
          const found = await this.attributeRepository.findBySlug(value);
          return Boolean(found && found.id !== id);
        },
      );
    }

    const attribute = await this.attributeRepository.update(id, {
      name: dto.name?.trim(),
      slug,
      description:
        dto.description !== undefined ? dto.description?.trim() ?? null : undefined,
      dataType: dto.dataType,
      unit: dto.unit !== undefined ? dto.unit?.trim() ?? null : undefined,
      scope: dto.scope,
      options: dto.options,
      isFilterable: dto.isFilterable,
      isRequired: dto.isRequired,
      sortOrder: dto.sortOrder,
    });

    return this.mapAttribute(attribute);
  }

  async deleteAttribute(id: string) {
    const existing = await this.attributeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'ATTRIBUTE_NOT_FOUND',
        message: 'Atributo no encontrado.',
      });
    }

    await this.attributeRepository.delete(id);
    return { message: 'Atributo eliminado correctamente.' };
  }

  private mapAttribute(attribute: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    dataType: string;
    unit: string | null;
    scope: string;
    options: string[];
    isFilterable: boolean;
    isRequired: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: attribute.id,
      slug: attribute.slug,
      name: attribute.name,
      description: attribute.description,
      dataType: attribute.dataType,
      unit: attribute.unit,
      scope: attribute.scope,
      options: attribute.options,
      isFilterable: attribute.isFilterable,
      isRequired: attribute.isRequired,
      sortOrder: attribute.sortOrder,
      createdAt: attribute.createdAt.toISOString(),
      updatedAt: attribute.updatedAt.toISOString(),
    };
  }
}
