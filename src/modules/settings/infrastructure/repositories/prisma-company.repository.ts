import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const COMPANY_ID = 'default';

@Injectable()
export class PrismaCompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate() {
    return this.prisma.companyProfile.upsert({
      where: { id: COMPANY_ID },
      update: {},
      create: { id: COMPANY_ID, country: 'PE' },
    });
  }

  update(data: Prisma.CompanyProfileUpdateInput) {
    return this.prisma.companyProfile.update({
      where: { id: COMPANY_ID },
      data,
    });
  }
}

export { COMPANY_ID };
