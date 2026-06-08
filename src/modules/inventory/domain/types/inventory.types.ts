import type { StockMovementType } from '../../../../generated/prisma/client';

export type WarehouseRecord = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type StockLevelRecord = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  variantId: string;
  sku: string;
  variantName: string | null;
  productId: string;
  productName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number | null;
  isLowStock: boolean;
  updatedAt: Date;
};

export type StockMovementRecord = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  variantId: string;
  sku: string;
  variantName: string | null;
  productName: string;
  type: StockMovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  note: string | null;
  performedById: string | null;
  performedByName: string | null;
  targetWarehouseId: string | null;
  targetWarehouseName: string | null;
  createdAt: Date;
};
