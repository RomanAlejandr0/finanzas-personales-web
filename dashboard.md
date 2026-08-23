# Dashboard — estado funcional

> Última revisión: 22 de agosto de 2026. Este documento es un resumen; el código y las migraciones son la fuente de detalle.

## Disponible

- Acceso autenticado que inicializa el universo personal.
- Selector de cuenta de activo; crear y editar cuentas de banco, efectivo o billetera.
- Registro y actualización del saldo actual por cuenta.
- Proyección diaria hasta el cierre del mes y su gráfica.
- Lista de compromisos previstos hasta el cierre del mes por cuenta y confirmación de los que vencen hoy.
- Alta y administración de compromisos por cuenta: suscripciones, servicios, pagos, gastos planeados e ingresos esperados, con recurrencia.
- Vista de compromisos para consultar el próximo pago, pausar o cancelar; al confirmar uno, se registra como transacción real.

## Aún no integrado al dashboard

- Registro manual de ingresos y gastos, actividad relevante y preguntas de IA.
- Vista consolidada entre cuentas y conexión bancaria.

## Datos conectados

- Lee `universes`, `accounts`, `commitments` y `commitment_occurrences` bajo RLS.
- Usa las RPC `initialize_personal_universe`, `create_asset_account`, `update_asset_account`, `record_balance_snapshot`, `create_commitment`, `pause_commitment`, `cancel_commitment`, `fulfill_commitment_occurrence` y `get_projected_balance_series`.
- El resumen del modelo vive en [`../supabase/resumen-modelo-base-de-datos.md`](../supabase/resumen-modelo-base-de-datos.md) y el detalle técnico en [`../supabase/catalogo-esquema-base-de-datos.md`](../supabase/catalogo-esquema-base-de-datos.md).
