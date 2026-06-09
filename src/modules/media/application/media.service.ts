import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildPaginationMeta } from '../../../shared/helpers/pagination.helper';
import type { UploadedImageFile } from '../../../shared/types/uploaded-file.type';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    folder?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 24, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MediaAssetWhereInput = {};

    if (params.folder) {
      where.folder = params.folder;
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { fileName: { contains: term, mode: 'insensitive' } },
        { alt: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapAsset(item)),
      total,
    );
  }

  async upload(file: UploadedImageFile, staffUserId?: string, folder?: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Archivo requerido.',
      });
    }

    const uploaded = await this.storage.uploadObject({
      folder: folder?.trim() || 'media-library',
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        fileName: file.originalname,
        storageKey: uploaded.storageKey,
        url: uploaded.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        folder: folder?.trim() || 'media-library',
        uploadedById: staffUserId,
      },
      include: {
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return this.mapAsset(asset);
  }

  async delete(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Archivo no encontrado.',
      });
    }

    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.mediaAsset.delete({ where: { id } });
    return { deleted: true };
  }

  private mapAsset(asset: {
    id: string;
    fileName: string;
    storageKey: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    folder: string | null;
    alt: string | null;
    createdAt: Date;
    uploadedBy?: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }) {
    return {
      id: asset.id,
      fileName: asset.fileName,
      storageKey: asset.storageKey,
      url: asset.url,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      folder: asset.folder,
      alt: asset.alt,
      createdAt: asset.createdAt,
      uploadedBy: asset.uploadedBy
        ? {
            id: asset.uploadedBy.id,
            email: asset.uploadedBy.email,
            name:
              [asset.uploadedBy.firstName, asset.uploadedBy.lastName]
                .filter(Boolean)
                .join(' ') || null,
          }
        : null,
    };
  }
}
