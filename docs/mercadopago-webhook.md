# Webhook Mercado Pago — Factosys Store API

## URL del webhook

```
{APP_URL}/{API_PREFIX}/webhooks/payments/MERCADO_PAGO
```

Ejemplo local: `http://localhost:3000/api/webhooks/payments/MERCADO_PAGO`

## Configuración en Mercado Pago

1. Entra a [Tus integraciones](https://www.mercadopago.com.pe/developers/panel/app).
2. Selecciona tu aplicación de prueba o producción.
3. Ve a **Webhooks** → **Configurar notificaciones**.
4. Modo **Producción** y **Pruebas**: usa la misma URL (con túnel tipo ngrok en desarrollo).
5. Eventos recomendados:
   - **Orders** (`order`, `merchant_order`)
   - **Payments** (`payment`)
6. Copia el **secret** generado y configúralo en `.env`:

```env
MERCADOPAGO_WEBHOOK_SECRET=tu_secret_del_panel
```

7. Reinicia la API para sincronizar el secret en `PaymentGatewayConfig`.

## Variables de entorno requeridas

```env
MERCADOPAGO_ENABLED=true
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...
APP_URL=https://tu-dominio.com
```

## Validación de firma

Si `MERCADOPAGO_WEBHOOK_SECRET` está configurado, la API **exige** el header `x-signature` de Mercado Pago. Sin firma válida, el webhook se rechaza.

## Flujo al recibir notificación

1. Mercado Pago envía `POST` con `data.id` (query o body).
2. La API consulta el recurso en MP (Order o Payment legacy).
3. Lee `external_reference` = ID interno del pedido.
4. Actualiza `PaymentTransaction`.
5. Si el pago quedó aprobado → marca pedido como pagado, confirma y envía email `order.paid`.

## Verificación

- Admin: `GET /api/admin/payment-gateways/MERCADO_PAGO/webhook-setup`
- Simulador de webhooks en el panel de MP.
- Revisar logs de la API y tabla `PaymentTransaction`.
