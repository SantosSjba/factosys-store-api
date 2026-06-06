import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';

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

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint', '');
    const region = this.configService.get<string>('storage.region', 'us-east-1');
    const forcePathStyle = this.configService.get<boolean>(
      'storage.forcePathStyle',
      true,
    );

    this.bucketName = this.configService.get<string>('storage.bucketName', '');
    this.publicUrl = this.configService
      .get<string>('storage.publicUrl', '')
      .replace(/\/$/, '');

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
      this.logger.warn('AWS_S3_BUCKET_NAME no configurado; storage deshabilitado.');
      return;
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
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

  getPublicUrl(storageKey: string): string {
    if (!this.publicUrl) {
      return storageKey;
    }

    return `${this.publicUrl}/${this.bucketName}/${storageKey}`;
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
      url: this.getPublicUrl(storageKey),
      mimeType: data.mimeType,
      sizeBytes: data.buffer.length,
    };
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
}
