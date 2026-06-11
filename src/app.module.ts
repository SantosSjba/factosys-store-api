import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import {
  appConfig,
  corsConfig,
  databaseConfig,
  elasticsearchConfig,
  googleConfig,
  jwtConfig,
  loggerConfig,
  mailConfig,
  queueConfig,
  redisConfig,
  storageConfig,
} from './config';
import { envValidationSchema } from './config/env.validation';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SalesModule } from './modules/sales/sales.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { PermissionsGuard } from './shared/guards/permissions.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { UserTypeGuard } from './shared/guards/user-type.guard';
import { AdminAuditInterceptor } from './shared/interceptors/admin-audit.interceptor';
import { HttpLoggingInterceptor } from './shared/interceptors/http-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        appConfig,
        corsConfig,
        databaseConfig,
        googleConfig,
        jwtConfig,
        loggerConfig,
        redisConfig,
        elasticsearchConfig,
        storageConfig,
        mailConfig,
        queueConfig,
      ],
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    InfrastructureModule,
    AuditModule,
    MediaModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    FavoritesModule,
    InventoryModule,
    SalesModule,
    PaymentsModule,
    MarketingModule,
    NotificationsModule,
    ReportsModule,
    SettingsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserTypeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminAuditInterceptor,
    },
  ],
})
export class AppModule {}
