# Auth & RBAC — Fases de implementación

## Fase 1 — Base de datos y roles ✅

- Schema Prisma: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`, `EmailVerificationToken`
- Prisma 7 + `prisma.config.ts` + adapter PostgreSQL
- Seed: permisos, roles (`customer`, `admin`, `manager`, `support`, `warehouse`), usuario admin inicial

```bash
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
```

**Usuarios seed (modular en `src/prisma/seed/`):**

| Usuario | Email por defecto | Roles |
|---------|-------------------|--------|
| Super (dev/QA) | `super@factosys.store` / `Super123!` | **Todos** (`customer`, `admin`, `manager`, `support`, `warehouse`) |
| Admin (panel) | `admin@factosys.store` / `Admin123!` | Solo `admin` (todos los permisos vía rol) |

Variables: `SEED_SUPER_EMAIL`, `SEED_SUPER_PASSWORD`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

---

## Fase 2 — JWT, guards y decoradores ✅

- `jwt.config.ts`, `TokenService`, `PasswordService`
- Guards globales: `JwtAuthGuard`, `UserTypeGuard`, `RolesGuard`, `PermissionsGuard`
- Decoradores: `@Public()`, `@Roles()`, `@RequirePermissions()`, `@UserTypes()`, `@CurrentUser()`

---

## Fase 3 — Panel administrativo (staff) ✅

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/auth/login` | Login staff |
| POST | `/api/admin/auth/refresh` | Renovar tokens |
| POST | `/api/admin/auth/logout` | Cerrar sesión |
| GET | `/api/admin/auth/login-audit` | Auditoría de logins (`users.read`) |
| GET | `/api/admin/users/me` | Perfil autenticado |
| GET | `/api/admin/users` | Listar staff |
| POST | `/api/admin/users` | Crear staff (solo interno) |
| GET | `/api/admin/roles` | Roles para asignación (`roles.read`) |

---

## Fase 4 — Tienda (cliente) ✅

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/store/auth/register` | Registro + email de verificación |
| POST | `/api/store/auth/verify-email` | Activar cuenta |
| POST | `/api/store/auth/login` | Login email/password |
| POST | `/api/store/auth/refresh` | Renovar tokens |
| POST | `/api/store/auth/logout` | Cerrar sesión |
| GET | `/api/store/me` | Perfil cliente |

---

## Fase 5 — Producción y OAuth ✅

### Seguridad HTTP (`main.ts`)
- Helmet
- Compression
- Cookie parser
- CORS con `FRONTEND_URL`, `ADMIN_FRONTEND_URL`, `APP_URL`

### Email de verificación
- `MailService` con Nodemailer
- Enlace: `{FRONTEND_URL}/verify-email?token=...`
- En desarrollo, si falla el envío, `register` puede devolver `verificationToken`

### Google OAuth (requiere variables en `.env`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/store/auth/google` | Redirige a Google |
| GET | `/api/store/auth/google/callback` | Callback → redirige al frontend con tokens |

Callback del frontend: `{FRONTEND_URL}/auth/google/callback?accessToken=...&refreshToken=...`

### Auditoría de logins
- Tabla `LoginAudit` (éxito/fallo, IP, user-agent, método)
- Registro en login local, Google y refresh exitoso

### Variables nuevas

```env
GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-secret
# Mismo valor en Google Console → URI de redirección autorizada
GOOGLE_CALLBACK_URL=https://127.0.0.1:3000/api/store/auth/google/callback
FRONTEND_URL=http://localhost:3001
ADMIN_FRONTEND_URL=http://localhost:3002
MAIL_SECURE=false
```

### Migración Fase 5

```bash
pnpm db:migrate
```

Nombre sugerido: `add_login_audit`
