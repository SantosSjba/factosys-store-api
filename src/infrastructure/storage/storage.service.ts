import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { extname } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export type UploadedObject = {
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly readableUrlBase: string;
  private readonly apiPrefix: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint', '');
    const region = this.configService.get<string>(
      'storage.region',
      'us-east-1',
    );
    const forcePathStyle = this.configService.get<boolean>(
      'storage.forcePathStyle',
      true,
    );

    this.bucketName = this.configService.get<string>('storage.bucketName', '');
    this.publicUrl = this.configService
      .get<string>('storage.publicUrl', '')
      .replace(/\/$/, '');
    this.readableUrlBase = this.configService
      .get<string>('storage.readableUrlBase', '')
      .replace(/\/$/, '');
    this.apiPrefix = this.configService.get<string>('app.apiPrefix', 'api');

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: endpoint ? forcePathStyle : undefined,
      credentials: {
        accessKeyId: this.configService.get<string>('storage.accessKeyId', ''),
        secretAccessKey: this.configService.get<string>(
          'storage.secretAccessKey',
          '',
        ),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.bucketName) {
      this.logger.warn(
        'AWS_S3_BUCKET_NAME no configurado; storage deshabilitado.',
      );
      return;
    }

    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`Bucket S3 listo: ${this.bucketName}`);
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucketName }),
        );
        this.logger.log(`Bucket S3 creado: ${this.bucketName}`);
      } catch (error) {
        this.logger.warn(
          `No se pudo verificar/crear el bucket ${this.bucketName}. Revisa credenciales MinIO/S3.`,
          error instanceof Error ? error.message : undefined,
        );
      }
    }
  }

  buildStorageKey(folder: string, originalName: string): string {
    const extension = extname(originalName).toLowerCase() || '.bin';
    return `${folder}/${randomUUID()}${extension}`;
  }

  /** URL directa a MinIO/S3 (solo si el bucket es público). */
  getPublicUrl(storageKey: string): string {
    if (!this.publicUrl) {
      return storageKey;
    }

    return `${this.publicUrl}/${this.bucketName}/${storageKey}`;
  }

  /**
   * URL servida por la API para buckets privados.
   * Ruta relativa `/api/media/...` compatible con el proxy de Nuxt en dev.
   */
  getReadableUrl(storageKey: string): string {
    if (!storageKey) {
      return '';
    }

    const path = `/${this.apiPrefix}/media/${storageKey}`;
    return this.readableUrlBase ? `${this.readableUrlBase}${path}` : path;
  }

  async uploadObject(data: {
    folder: string;
    originalName: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<UploadedObject> {
    const storageKey = this.buildStorageKey(data.folder, data.originalName);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
        Body: data.buffer,
        ContentType: data.mimeType,
      }),
    );

    return {
      storageKey,
      url: this.getReadableUrl(storageKey),
      mimeType: data.mimeType,
      sizeBytes: data.buffer.length,
    };
  }

  async streamObject(storageKey: string, response: Response): Promise<void> {
    if (!this.bucketName) {
      throw new NotFoundException({
        code: 'STORAGE_DISABLED',
        message: 'Almacenamiento no configurado.',
      });
    }

    try {
      const output = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );

      if (output.ContentType) {
        response.setHeader('Content-Type', output.ContentType);
      }

      if (output.ContentLength != null) {
        response.setHeader('Content-Length', String(output.ContentLength));
      }

      response.setHeader('Cache-Control', 'public, max-age=86400');

      const body = output.Body;
      if (!body) {
        throw new NotFoundException({
          code: 'MEDIA_NOT_FOUND',
          message: 'Archivo no encontrado.',
        });
      }

      if (body instanceof Readable) {
        await pipeline(body, response);
        return;
      }

      const bytes = await body.transformToByteArray();
      response.end(Buffer.from(bytes));
    } catch (error: unknown) {
      if (this.isMissingObjectError(error)) {
        throw new NotFoundException({
          code: 'MEDIA_NOT_FOUND',
          message: 'Archivo no encontrado.',
        });
      }

      throw error;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    if (!storageKey) return;

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      }),
    );
  }

  private isMissingObjectError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const name = 'name' in error ? String(error.name) : '';
    const code = 'Code' in error ? String(error.Code) : '';

    return (
      name === 'NoSuchKey' ||
      name === 'NotFound' ||
      code === 'NoSuchKey' ||
      code === 'NotFound'
    );
  }
}
