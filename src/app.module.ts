import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  appConfig,
  databaseConfig,
  elasticsearchConfig,
  loggerConfig,
  mailConfig,
  queueConfig,
  redisConfig,
  storageConfig,
} from './config';
import { HttpLoggingInterceptor } from './shared/interceptors/http-logging.interceptor';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { envValidationSchema } from './config/env.validation';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SalesModule } from './modules/sales/sales.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        appConfig,
        databaseConfig,
        loggerConfig,
        redisConfig,
        elasticsearchConfig,
        storageConfig,
        mailConfig,
        queueConfig,
      ],
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env',
      ],
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    InfrastructureModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    PaymentsModule,
    MarketingModule,
    NotificationsModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule {}
