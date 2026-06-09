import { Global, Module } from '@nestjs/common';
import { AdminAuditController } from './presentation/admin-audit.controller';
import { AdminAuditService } from './application/admin-audit.service';

@Global()
@Module({
  controllers: [AdminAuditController],
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AuditModule {}
