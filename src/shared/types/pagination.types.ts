export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationQueryDto {
  page?: number;
  limit?: number;
}
