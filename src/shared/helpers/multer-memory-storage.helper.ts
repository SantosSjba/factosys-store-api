import { createRequire } from 'node:module';

const nodeRequire = createRequire(__filename);

type MulterMemoryStorage = {
  _handleFile(
    req: unknown,
    file: unknown,
    callback: (error: Error | null, info?: unknown) => void,
  ): void;
  _removeFile(
    req: unknown,
    file: unknown,
    callback: (error: Error | null) => void,
  ): void;
};

export function createMulterMemoryStorage(): MulterMemoryStorage {
  const multer = nodeRequire('multer') as {
    memoryStorage: () => MulterMemoryStorage;
  };

  return multer.memoryStorage();
}
