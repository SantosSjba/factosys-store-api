import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class UpsertCartItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: 99, default: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity = 1;
}
