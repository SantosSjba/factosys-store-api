import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../../../../infrastructure/storage/storage.service';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import type { CompanyProfileRecord } from '../../domain/types/settings.types';
import { PrismaCompanyRepository } from '../../infrastructure/repositories/prisma-company.repository';
import { UpdateCompanyProfileDto } from '../dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: PrismaCompanyRepository,
    private readonly storageService: StorageService,
  ) {}

  async getCompany() {
    const company = await this.companyRepository.getOrCreate();
    return this.mapCompany(company);
  }

  async updateCompany(dto: UpdateCompanyProfileDto) {
    const company = await this.companyRepository.update({
      legalName: dto.legalName?.trim() ?? undefined,
      tradeName: dto.tradeName?.trim() ?? undefined,
      taxId: dto.taxId?.trim() ?? undefined,
      taxRegime: dto.taxRegime?.trim() ?? undefined,
      fiscalAddress: dto.fiscalAddress?.trim() ?? undefined,
      district: dto.district?.trim() ?? undefined,
      province: dto.province?.trim() ?? undefined,
      department: dto.department?.trim() ?? undefined,
      country: dto.country?.trim() ?? undefined,
      supportEmail: dto.supportEmail?.trim() ?? undefined,
      supportPhone: dto.supportPhone?.trim() ?? undefined,
      whatsapp: dto.whatsapp?.trim() ?? undefined,
      website: dto.website?.trim() ?? undefined,
    });

    return this.mapCompany(company);
  }

  async uploadLogo(file: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Debes enviar un archivo de imagen.',
      });
    }

    const existing = await this.companyRepository.getOrCreate();
    if (existing.logoKey) {
      await this.storageService.deleteObject(existing.logoKey);
    }

    const uploaded = await this.storageService.uploadObject({
      folder: 'settings/company',
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const company = await this.companyRepository.update({
      logoKey: uploaded.storageKey,
      logoUrl: this.storageService.getReadableUrl(uploaded.storageKey),
    });

    return this.mapCompany(company);
  }

  async deleteLogo() {
    const existing = await this.companyRepository.getOrCreate();
    if (existing.logoKey) {
      await this.storageService.deleteObject(existing.logoKey);
    }

    const company = await this.companyRepository.update({
      logoKey: null,
      logoUrl: null,
    });

    return this.mapCompany(company);
  }

  private mapCompany(company: {
    id: string;
    legalName: string | null;
    tradeName: string | null;
    taxId: string | null;
    taxRegime: string | null;
    fiscalAddress: string | null;
    district: string | null;
    province: string | null;
    department: string | null;
    country: string;
    supportEmail: string | null;
    supportPhone: string | null;
    whatsapp: string | null;
    website: string | null;
    logoUrl: string | null;
    logoKey?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyProfileRecord {
    return {
      id: company.id,
      legalName: company.legalName,
      tradeName: company.tradeName,
      taxId: company.taxId,
      taxRegime: company.taxRegime,
      fiscalAddress: company.fiscalAddress,
      district: company.district,
      province: company.province,
      department: company.department,
      country: company.country,
      supportEmail: company.supportEmail,
      supportPhone: company.supportPhone,
      whatsapp: company.whatsapp,
      website: company.website,
      logoUrl: company.logoKey
        ? this.storageService.getReadableUrl(company.logoKey)
        : company.logoUrl,
      logoKey: company.logoKey ?? null,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
