# Integración Mercado Pago — Checkout API (Factosys Store)

Integración **exclusiva de Checkout API** para Perú. No usamos Checkout Pro (redirección) ni el producto empaquetado "Checkout Bricks" (Payment Brick todo-en-uno).

Documentación oficial: [Checkout API Orders — Perú](https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/overview)

## Qué usamos vs qué no

| Solución MP | ¿Lo usamos? | Motivo |
|-------------|-------------|--------|
| **Checkout API** | **Sí** | Cobro en tu sitio, `POST /v1/orders` |
| Checkout Bricks (Payment Brick) | No | Producto simplificado distinto; nosotros integramos Checkout API directamente |
| Checkout Pro | No | Redirige al checkout de Mercado Pago |

## Medios de pago (Perú — Checkout API)

| Medio | Frontend | Backend |
|-------|----------|---------|
| Tarjeta crédito/débito | `StoreMercadoPagoCardForm` + MercadoPago.js | `POST /v1/orders` |
| Yape | `StoreMercadoPagoYapeForm` + MercadoPago.js | `POST /v1/orders` |

> El formulario de tarjeta usa el componente recomendado por MP dentro de Checkout API ([integración de tarjetas](https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/payment-integration/cards)). El token se envía al backend y se crea la orden con la API Orders.

## Flujo

```
Checkout → pedido GATEWAY → /checkout/pagar/:id
    → Cliente elige tarjeta o Yape (en tu sitio)
    → MercadoPago.js tokeniza
    → API Factosys → POST /v1/orders (Checkout API)
    → Webhook confirma pagos asíncronos
    → Pedido CONFIRMED + email
```

## Configuración

Ver variables en `.env.example` y [mercadopago-webhook.md](./mercadopago-webhook.md).

## Endpoints

| Método | Ruta |
|--------|------|
| GET | `/api/store/payments/mercadopago/config` |
| GET | `/api/store/payments/mercadopago/payment-methods` |
| GET | `/api/store/payments/mercadopago/orders/:id/payment-context` |
| POST | `/api/store/payments/mercadopago/orders/:id/pay` |
| POST | `/api/webhooks/payments/MERCADO_PAGO` |
| GET | `/api/admin/payment-gateways/MERCADO_PAGO/webhook-setup` |
| POST | `/api/admin/orders/:id/refund` (dispara reembolso automático en MP si `paymentMethod = GATEWAY`) |

## Reembolsos

Cuando el staff reembolsa (total o parcial) un pedido pagado con Mercado Pago desde el admin, la API llama automáticamente a `POST /v1/orders/{order_id}/refund` en Mercado Pago **antes** de marcar el pedido como reembolsado en la base de datos. Si Mercado Pago rechaza el reembolso (fondos insuficientes, orden ya reembolsada, etc.), el pedido **no** se marca como reembolsado y el admin muestra el motivo del rechazo.

Para pedidos con otros métodos de pago (efectivo, transferencia, Yape/Plin manual), el reembolso solo actualiza el estado interno; el dinero se devuelve manualmente fuera del sistema.

## Pruebas (sandbox)

| Campo | Valor |
|-------|-------|
| Tarjeta | `5031 7557 3453 0604` |
| CVV / vence | `123` / `11/30` |
| Titular | `APRO` |
| Yape | `111111111` / OTP `123456` |

### Correo del comprador en modo prueba

Mercado Pago exige un correo distinto según el tipo de cuenta vendedora usada en `MERCADOPAGO_ACCESS_TOKEN`:

- **Cuenta `test_user`** (creada desde "Cuentas de prueba" del panel): el correo debe ser único por operación y terminar en `@testuser.com`. La API lo genera automáticamente por pedido (`test_payer_XXXXXXXXXX@testuser.com`) — no lo escribas manualmente.
- **Credenciales de prueba de tu cuenta real** ("Credenciales de prueba" en tu app): usa `test@testuser.com` o el correo del pedido, según lo que indique la UI de pago.

La app detecta el tipo de cuenta automáticamente al iniciar (`getCredentialDiagnostics`) y ajusta el correo sin intervención manual. Revisa el diagnóstico en Configuración → Pasarelas de pago → ícono de estetoscopio.

## Archivos

**API:** `src/modules/payments/mercadopago/`

**Web:** `app/pages/checkout/pagar/`, `app/components/store/StoreMercadoPago*.vue`
