export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string;
  details: unknown;
  timestamp: string;
  path: string;
}

export interface ResolvedApplicationError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
