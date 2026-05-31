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

## Arquitectura

FACTOSYS STORE utilizará:

* Clean Architecture
* Domain Driven Design (DDD)
* Modular Monolith
* SOLID
* CQRS Ready
* Event Driven Ready

Objetivos:

* Separar reglas de negocio de infraestructura.
* Facilitar testing.
* Permitir evolución a microservicios.
* Mantener bajo acoplamiento.
* Escalar a marketplace y aplicaciones móviles.

---

# Estructura General

```text
src
│
├── config
│
├── shared
│
├── infrastructure
│
├── modules
│
├── jobs
│
├── queues
│
├── events
│
├── prisma
│
├── app.module.ts
│
└── main.ts
```

---

# Config

Configuraciones globales.

```text
config
│
├── app.config.ts
├── database.config.ts
├── redis.config.ts
├── elasticsearch.config.ts
├── storage.config.ts
├── mail.config.ts
├── queue.config.ts
└── swagger.config.ts
```

---

# Shared

Código reutilizable para toda la aplicación.

```text
shared
│
├── constants
├── decorators
├── enums
├── exceptions
├── filters
├── guards
├── interceptors
├── middleware
├── pipes
├── helpers
├── utils
├── types
└── interfaces
```

---

# Infrastructure

Implementaciones técnicas.

```text
infrastructure
│
├── prisma
├── redis
├── elasticsearch
├── storage
├── mail
├── queues
├── events
├── cache
└── monitoring
```

---

# Prisma

```text
prisma
│
├── schema.prisma
├── migrations
├── seed.ts
├── prisma.module.ts
└── prisma.service.ts
```

---

# Módulos de Negocio

Cada módulo seguirá la misma estructura:

```text
module
│
├── domain
├── application
├── infrastructure
├── presentation
└── module.module.ts
```

---

# Domain

Reglas de negocio puras.

```text
domain
│
├── entities
├── repositories
├── value-objects
├── events
├── enums
└── exceptions
```

No depende de:

* NestJS
* Prisma
* PostgreSQL
* Redis
* Elasticsearch

---

# Application

Casos de uso.

```text
application
│
├── dto
├── commands
├── queries
├── use-cases
└── services
```

---

# Infrastructure del Módulo

Implementaciones técnicas.

```text
infrastructure
│
├── repositories
├── mappers
├── persistence
└── adapters
```

---

# Presentation

Capa HTTP.

```text
presentation
│
├── controllers
├── validators
├── presenters
└── routes
```

---

# Módulos Principales

```text
modules
│
├── auth
│
├── users
│
├── catalog
│
├── inventory
│
├── sales
│
├── payments
│
├── marketing
│
├── notifications
│
├── reports
│
└── settings
```

---

# Auth

```text
auth
│
├── domain
├── application
├── infrastructure
├── presentation
└── auth.module.ts
```

Responsabilidades:

* Login
* JWT
* Refresh Token
* Recuperación de contraseña

---

# Users

```text
users
│
├── domain
├── application
├── infrastructure
├── presentation
└── users.module.ts
```

Responsabilidades:

* Usuarios
* Roles
* Permisos

---

# Catalog

Contexto principal del e-commerce.

```text
catalog
│
├── brands
│
├── categories
│
├── attributes
│
├── variants
│
├── products
│
└── catalog.module.ts
```

Responsabilidades:

* Productos
* Categorías
* Marcas
* Variantes
* Atributos
* Imágenes

---

# Inventory

```text
inventory
│
├── warehouses
│
├── stock
│
├── movements
│
└── inventory.module.ts
```

Responsabilidades:

* Inventario
* Almacenes
* Reservas
* Movimientos

---

# Sales

```text
sales
│
├── carts
│
├── orders
│
├── order-items
│
└── sales.module.ts
```

Responsabilidades:

* Carrito
* Pedidos
* Historial de compras

---

# Payments

```text
payments
│
├── gateways
│
├── transactions
│
└── payments.module.ts
```

Responsabilidades:

* Culqi
* Mercado Pago
* Izipay
* Stripe
* PayPal

---

# Marketing

```text
marketing
│
├── coupons
│
├── banners
│
├── campaigns
│
└── marketing.module.ts
```

Responsabilidades:

* Cupones
* Promociones
* Campañas
* Banners

---

# Notifications

```text
notifications
│
├── email
│
├── sms
│
├── push
│
└── notifications.module.ts
```

Responsabilidades:

* Email
* SMS
* Push Notifications

---

# Reports

```text
reports
│
├── excel
│
├── pdf
│
└── reports.module.ts
```

Responsabilidades:

* Reportes
* Exportación Excel
* Exportación PDF

---

# Settings

```text
settings
│
├── currencies
├── taxes
├── companies
└── settings.module.ts
```

Responsabilidades:

* Configuración global
* Impuestos
* Monedas
* Datos de empresa

---

# Jobs

Procesos programados.

```text
jobs
│
├── inventory
├── notifications
├── reports
└── orders
```

---

# Queues

Colas BullMQ.

```text
queues
│
├── email.queue.ts
├── inventory.queue.ts
├── image.queue.ts
└── report.queue.ts
```

---

# Events

Eventos del dominio.

```text
events
│
├── product-created.event.ts
├── order-created.event.ts
├── order-paid.event.ts
├── stock-updated.event.ts
└── user-created.event.ts
```

---

# Preparado para Futuras Expansiones

* Marketplace
* Multiempresa
* Multialmacén
* Multiidioma
* Flutter App
* IA de Recomendaciones
* ERP Integration
* Facturación Electrónica
* Microservicios

```
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
