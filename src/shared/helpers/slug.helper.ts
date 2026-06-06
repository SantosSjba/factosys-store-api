export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const normalized = slugify(baseSlug) || 'item';
  let candidate = normalized;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
