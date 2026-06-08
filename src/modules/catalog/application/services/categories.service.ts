import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Category } from '../../../../generated/prisma/client';
import { StorageService } from '../../../../infrastructure/storage/storage.service';
import { ensureUniqueSlug } from '../../../../shared/helpers/slug.helper';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import type { CategoryNode } from '../../domain/types/catalog.types';
import { PrismaCategoryRepository } from '../../infrastructure/repositories/prisma-category.repository';
import { AssignCategoryAttributesDto } from '../dto/assign-category-attributes.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: PrismaCategoryRepository,
    private readonly storageService: StorageService,
  ) {}

  async listTree() {
    const categories = await this.categoryRepository.listAll();
    return this.buildTree(categories);
  }

  async listFlat() {
    const categories = await this.categoryRepository.listAll();
    return categories.map((category) => this.mapCategory(category));
  }

  async getCategory(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }

    const attributes = await this.categoryRepository.listCategoryAttributes(id);

    return {
      ...this.mapCategory(category),
      attributes: attributes.map((entry) => ({
        attributeId: entry.attributeId,
        attributeName: entry.attribute.name,
        attributeSlug: entry.attribute.slug,
        scope: entry.attribute.scope,
        dataType: entry.attribute.dataType,
        isRequired: entry.isRequired,
        sortOrder: entry.sortOrder,
      })),
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException({
          code: 'PARENT_CATEGORY_NOT_FOUND',
          message: 'La categoría padre no existe.',
        });
      }
    }

    const slug = await ensureUniqueSlug(dto.slug ?? dto.name, async (value) =>
      Boolean(await this.categoryRepository.findBySlug(value)),
    );

    const category = await this.categoryRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() ?? null,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.mapCategory(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }

    if (dto.parentId === id) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY_PARENT',
        message: 'Una categoría no puede ser padre de sí misma.',
      });
    }

    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException({
          code: 'PARENT_CATEGORY_NOT_FOUND',
          message: 'La categoría padre no existe.',
        });
      }
    }

    let slug = existing.slug;
    if (dto.slug || dto.name) {
      slug = await ensureUniqueSlug(
        dto.slug ?? dto.name ?? existing.name,
        async (value) => {
          const found = await this.categoryRepository.findBySlug(value);
          return Boolean(found && found.id !== id);
        },
      );
    }

    const category = await this.categoryRepository.update(id, {
      name: dto.name?.trim(),
      slug,
      description:
        dto.description !== undefined ? dto.description?.trim() ?? null : undefined,
      parent:
        dto.parentId !== undefined
          ? dto.parentId
            ? { connect: { id: dto.parentId } }
            : { disconnect: true }
          : undefined,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });

    return this.mapCategory(category);
  }

  async deleteCategory(id: string) {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }

    const [childrenCount, productsCount] = await Promise.all([
      this.categoryRepository.countChildren(id),
      this.categoryRepository.countProducts(id),
    ]);

    if (childrenCount > 0) {
      throw new ConflictException({
        code: 'CATEGORY_HAS_CHILDREN',
        message: 'No se puede eliminar una categoría con subcategorías.',
      });
    }

    if (productsCount > 0) {
      throw new ConflictException({
        code: 'CATEGORY_HAS_PRODUCTS',
        message: 'No se puede eliminar una categoría con productos asociados.',
      });
    }

    await this.categoryRepository.delete(id);
    return { message: 'Categoría eliminada correctamente.' };
  }

  async assignAttributes(categoryId: string, dto: AssignCategoryAttributesDto) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }

    await this.categoryRepository.replaceCategoryAttributes(
      categoryId,
      dto.attributes.map((item, index) => ({
        attributeId: item.attributeId,
        isRequired: item.isRequired ?? false,
        sortOrder: item.sortOrder ?? index,
      })),
    );

    return this.getCategory(categoryId);
  }

  async uploadCategoryImage(categoryId: string, file: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Debes enviar un archivo de imagen.',
      });
    }

    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }

    if (category.imageKey) {
      await this.storageService.deleteObject(category.imageKey);
    }

    const uploaded = await this.storageService.uploadObject({
      folder: `catalog/categories/${categoryId}`,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const updated = await this.categoryRepository.update(categoryId, {
      imageKey: uploaded.storageKey,
      imageUrl: this.storageService.getReadableUrl(uploaded.storageKey),
    });

    return this.mapCategory(updated);
  }

  async deleteCategoryImage(categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }

    if (category.imageKey) {
      await this.storageService.deleteObject(category.imageKey);
    }

    const updated = await this.categoryRepository.update(categoryId, {
      imageKey: null,
      imageUrl: null,
    });

    return this.mapCategory(updated);
  }

  private mapCategory(category: Category) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      imageUrl: category.imageKey
        ? this.storageService.getReadableUrl(category.imageKey)
        : category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private buildTree(categories: Category[]): CategoryNode[] {
    const nodes = new Map<string, CategoryNode>();

    for (const category of categories) {
      nodes.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        children: [],
      });
    }

    const roots: CategoryNode[] = [];

    for (const category of categories) {
      const node = nodes.get(category.id);
      if (!node) continue;

      if (category.parentId && nodes.has(category.parentId)) {
        nodes.get(category.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (items: CategoryNode[]) => {
      items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      items.forEach((item) => sortNodes(item.children));
    };

    sortNodes(roots);
    return roots;
  }
}
