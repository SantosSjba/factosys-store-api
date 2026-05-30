# FACTOSYS STORE API

Backend principal para la plataforma E-Commerce FACTOSYS STORE.

## Tecnologías Base

* NestJS
* PostgreSQL
* Prisma ORM
* Redis
* Elasticsearch
* AWS S3
* Docker
* JWT Authentication
* Swagger/OpenAPI
* BullMQ
* Event Emitter
* Cache Manager

---

# Instalación del Proyecto

## Crear Proyecto

```bash
npm i -g @nestjs/cli

nest new factosys-store-api
```

o usando pnpm:

```bash
pnpm create nestjs factosys-store-api
```

---

# Variables de Entorno

```bash
pnpm install @nestjs/config
```

---

# Validaciones

```bash
pnpm install class-validator class-transformer
```

---

# Prisma ORM

## Instalar Prisma

```bash
pnpm install prisma --save-dev

pnpm install @prisma/client
```

## Inicializar Prisma

```bash
npx prisma init
```

---

# Autenticación JWT

```bash
pnpm install @nestjs/jwt

pnpm install @nestjs/passport

pnpm install passport

pnpm install passport-jwt

pnpm install bcrypt
```

## Tipos

```bash
pnpm install -D @types/bcrypt
```

---

# Redis

```bash
pnpm install ioredis
```

---

# Event Emitter

```bash
pnpm install @nestjs/event-emitter
```

---

# Cache Manager

```bash
pnpm install @nestjs/cache-manager

pnpm install cache-manager
```

---

# Tareas Programadas (Cron Jobs)

```bash
pnpm install @nestjs/schedule
```

---

# Elasticsearch

```bash
pnpm install @nestjs/elasticsearch

pnpm install @elastic/elasticsearch
```

---

# AWS S3

```bash
pnpm install @aws-sdk/client-s3
```

---

# Upload de Archivos

```bash
pnpm install @nestjs/platform-express

pnpm install multer
```

---

# Swagger

```bash
pnpm install @nestjs/swagger

pnpm install swagger-ui-express
```

---

# Rate Limiting

```bash
pnpm install @nestjs/throttler
```

---

# Health Checks

```bash
pnpm install @nestjs/terminus
```

---

# Logs

```bash
pnpm install nest-winston

pnpm install winston
```

---

# Seguridad

## Helmet

```bash
pnpm install helmet
```

## Compression

```bash
pnpm install compression
```

## Cookies

```bash
pnpm install cookie-parser
```

### Tipos

```bash
pnpm install -D @types/cookie-parser
```

---

# UUID

```bash
pnpm install uuid
```

### Tipos

```bash
pnpm install -D @types/uuid
```

---

# Manejo de Fechas

```bash
pnpm install dayjs
```

---

# Colas de Procesamiento (BullMQ)

```bash
pnpm install @nestjs/bullmq

pnpm install bullmq

pnpm install ioredis
```

### Casos de uso

* Procesamiento de imágenes
* Correos electrónicos
* Notificaciones
* Sincronización Elasticsearch
* Exportaciones Excel
* Generación de PDFs
* Procesos en segundo plano

---

# Envío de Correos

```bash
pnpm install @nestjs-modules/mailer

pnpm install nodemailer
```

---

# Exportación Excel

```bash
pnpm install exceljs
```

---

# Generación PDF

```bash
pnpm install pdfkit
```

---

# Transformación y Mapeo de DTOs

```bash
pnpm install automapper-core

pnpm install @automapper/classes

pnpm install @automapper/nestjs
```

---

# Dependencias Base Recomendadas

```bash
pnpm install \
@nestjs/config \
@nestjs/jwt \
@nestjs/passport \
@nestjs/swagger \
@nestjs/throttler \
@nestjs/cache-manager \
@nestjs/event-emitter \
@nestjs/schedule \
@nestjs/terminus \
@nestjs/elasticsearch \
@nestjs/platform-express \
@nestjs-modules/mailer \
@nestjs/bullmq \
class-validator \
class-transformer \
passport \
passport-jwt \
bcrypt \
@prisma/client \
ioredis \
swagger-ui-express \
helmet \
compression \
cookie-parser \
uuid \
dayjs \
cache-manager \
@aws-sdk/client-s3 \
nodemailer \
@elastic/elasticsearch \
multer \
bullmq \
exceljs \
pdfkit \
automapper-core \
@automapper/classes \
@automapper/nestjs
```

---

# Dependencias de Desarrollo

```bash
pnpm install -D \
prisma \
@types/bcrypt \
@types/cookie-parser \
@types/uuid
```

---

# Estructura Inicial del Proyecto

```text
src
│
├── config
│
├── prisma
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│
├── common
│   ├── constants
│   ├── enums
│   ├── decorators
│   ├── exceptions
│   ├── interfaces
│   ├── helpers
│   ├── utils
│   ├── guards
│   ├── filters
│   ├── interceptors
│   ├── pipes
│   └── middleware
│
├── modules
│   ├── auth
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── categories
│   ├── brands
│   ├── products
│   ├── attributes
│   ├── product-variants
│   ├── inventory
│   ├── warehouses
│   ├── uploads
│   ├── carts
│   ├── orders
│   ├── payments
│   ├── coupons
│   ├── banners
│   ├── notifications
│   ├── reports
│   ├── settings
│   └── audit
│
├── jobs
│
├── queues
│
├── events
│
├── app.module.ts
└── main.ts
```

---

# Docker Services Iniciales

```yaml
services:
  postgres:
  redis:
  elasticsearch:
  kibana:
  minio:
```

---

# Roadmap Inicial

## Sprint 1

* Configuración NestJS
* Docker
* PostgreSQL
* Prisma
* Swagger
* JWT
* Roles y Permisos
* Usuarios
* Auditoría
* Health Checks

## Sprint 2

* Categorías
* Marcas
* Productos
* Variantes
* Atributos
* Imágenes

## Sprint 3

* Inventario
* Almacenes
* Movimientos
* Stock
* Reservas

## Sprint 4

* Carrito
* Pedidos
* Cupones
* Pagos

## Sprint 5

* Redis
* Elasticsearch
* Notificaciones
* Correos

## Sprint 6

* Dashboard Administrativo
* Reportes
* Analytics
* Exportación Excel
* Exportación PDF

## Sprint 7

* Aplicación Móvil
* API Pública
* Marketplace
* IA de Recomendaciones

```
```
