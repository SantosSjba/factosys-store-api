import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { PermissionSlug } from '../../../../shared/constants/permissions.constants';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    example: ['users.read', 'orders.read'],
    description: 'Slugs de permisos a asignar al rol',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionSlugs: PermissionSlug[];
}
