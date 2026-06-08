export function resolveDisplayPrimaryImage<
  T extends { isPrimary: boolean; sortOrder: number },
>(images: T[]): T | null {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.find((image) => image.isPrimary) ?? sorted[0] ?? null;
}
