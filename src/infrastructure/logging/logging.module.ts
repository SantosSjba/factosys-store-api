import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig } from './winston.config';
import { StartupLoggerService } from './startup-logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createWinstonConfig(configService),
    }),
  ],
  providers: [StartupLoggerService],
  exports: [WinstonModule],
})
export class LoggingModule {}
