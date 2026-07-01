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

## Pruebas (sandbox)

| Campo | Valor |
|-------|-------|
| Email | `test@testuser.com` |
| Tarjeta | `5031 7557 3453 0604` |
| CVV / vence | `123` / `11/30` |
| Titular | `APRO` |
| Yape | `111111111` / OTP `123456` |

## Archivos

**API:** `src/modules/payments/mercadopago/`

**Web:** `app/pages/checkout/pagar/`, `app/components/store/StoreMercadoPago*.vue`
