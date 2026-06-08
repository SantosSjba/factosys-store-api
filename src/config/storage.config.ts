import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  region: process.env.AWS_REGION ?? 'us-east-1',
  bucketName: process.env.AWS_S3_BUCKET_NAME ?? '',
  endpoint: process.env.AWS_S3_ENDPOINT ?? '',
  publicUrl: process.env.AWS_S3_PUBLIC_URL ?? process.env.AWS_S3_ENDPOINT ?? '',
  readableUrlBase: process.env.AWS_S3_READABLE_URL_BASE ?? '',
  forcePathStyle:
    process.env.AWS_S3_FORCE_PATH_STYLE !== 'false' &&
    process.env.AWS_S3_FORCE_PATH_STYLE !== '0',
}));
