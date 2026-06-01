export function getDatabaseHostLabel(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const port = url.port || '5432';
    return `${url.hostname}:${port}`;
  } catch {
    return 'host desconocido';
  }
}

function resolveErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }

  if ('errors' in error && Array.isArray(error.errors)) {
    for (const nested of error.errors) {
      const nestedCode = resolveErrorCode(nested);
      if (nestedCode) {
        return nestedCode;
      }
    }
  }

  return undefined;
}

export function getDatabaseConnectionMessage(error: unknown): string {
  const code = resolveErrorCode(error);

  switch (code) {
    case 'ECONNREFUSED':
      return 'No se pudo conectar a la base de datos: el servidor PostgreSQL no está disponible.';
    case 'ENOTFOUND':
      return 'No se pudo conectar a la base de datos: host no encontrado.';
    case 'ETIMEDOUT':
      return 'No se pudo conectar a la base de datos: tiempo de espera agotado.';
    case '28P01':
      return 'No se pudo conectar a la base de datos: usuario o contraseña incorrectos.';
    case '3D000':
      return 'No se pudo conectar a la base de datos: la base de datos no existe.';
    default:
      return 'No se pudo conectar a la base de datos.';
  }
}
