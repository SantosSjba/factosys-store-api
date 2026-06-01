import { PaginationQueryDto, PaginationResult } from '../types/pagination.types';

export function buildPaginationMeta<T>(
  query: PaginationQueryDto,
  items: T[],
  total: number,
): PaginationResult<T> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
