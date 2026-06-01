import { Module } from '@nestjs/common';
import { LoggingModule } from './logging/logging.module';
import { CacheInfrastructureModule } from './cache/cache.module';
import { ElasticsearchInfrastructureModule } from './elasticsearch/elasticsearch.module';
import { EventsInfrastructureModule } from './events/events.module';
import { MailInfrastructureModule } from './mail/mail.module';
import { MonitoringInfrastructureModule } from './monitoring/monitoring.module';
import { PrismaInfrastructureModule } from './prisma/prisma.module';
import { QueuesInfrastructureModule } from './queues/queues.module';
import { RedisInfrastructureModule } from './redis/redis.module';
import { StorageInfrastructureModule } from './storage/storage.module';

@Module({
  imports: [
    LoggingModule,
    CacheInfrastructureModule,
    ElasticsearchInfrastructureModule,
    EventsInfrastructureModule,
    MailInfrastructureModule,
    MonitoringInfrastructureModule,
    PrismaInfrastructureModule,
    QueuesInfrastructureModule,
    RedisInfrastructureModule,
    StorageInfrastructureModule,
  ],
  exports: [
    LoggingModule,
    CacheInfrastructureModule,
    ElasticsearchInfrastructureModule,
    EventsInfrastructureModule,
    MailInfrastructureModule,
    MonitoringInfrastructureModule,
    PrismaInfrastructureModule,
    QueuesInfrastructureModule,
    RedisInfrastructureModule,
    StorageInfrastructureModule,
  ],
})
export class InfrastructureModule {}
