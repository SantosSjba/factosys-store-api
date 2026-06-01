import { ConfigService } from '@nestjs/config';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModuleOptions,
} from 'nest-winston';
import * as winston from 'winston';

export function createWinstonConfig(
  configService: ConfigService,
): WinstonModuleOptions {
  const level = configService.get<string>('logger.level', 'info');
  const appName = configService.get<string>('app.name', 'factosys-store-api');

  return {
    level,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike(appName, {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    ],
  };
}
