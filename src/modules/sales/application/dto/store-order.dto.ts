import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreOrderPreviewItemDto {
  @ApiProperty()
  productName!: string;

  @ApiPropertyOptional({ nullable: true })
  variantName!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;
}

export class StoreOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty()
  deliveryMethod!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  total!: string;

  @ApiProperty()
  itemCount!: number;

  @ApiPropertyOptional({ type: StoreOrderPreviewItemDto, nullable: true })
  previewItem!: StoreOrderPreviewItemDto | null;

  @ApiProperty()
  extraItemsCount!: number;

  @ApiPropertyOptional({ nullable: true })
  deliveredAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  shippedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
