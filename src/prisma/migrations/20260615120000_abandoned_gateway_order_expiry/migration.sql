-- Plazo en horas para cancelar pedidos GATEWAY sin pagar (NULL o 0 = deshabilitado)
ALTER TABLE "StoreSettings" ADD COLUMN "abandonedGatewayOrderExpiryHours" INTEGER DEFAULT 48;
