# Finanzas Personales

Aplicación web para consultar cuentas personales, registrar saldos y visualizar proyecciones financieras. Incluye soporte para cuentas de efectivo y tarjetas de crédito, además de compromisos como recibos, pagos e ingresos previstos.

**Aplicación:** [finanzas-personales-web-theta.vercel.app](https://finanzas-personales-web-theta.vercel.app)

## Funcionalidades

- Registro e inicio de sesión con Supabase Auth.
- Creación y edición de cuentas de efectivo y tarjetas de crédito.
- Registro de saldos y consulta de su proyección.
- Proyección de deuda y crédito disponible para tarjetas.
- Gestión de compromisos recurrentes o puntuales e instancias previstas.
- Interfaz en español, adaptable y con tema claro/oscuro.

## Tecnologías

- Next.js con App Router y React.
- TypeScript y Tailwind CSS.
- Supabase Auth y Supabase Database.
- Componentes basados en shadcn/ui y Radix UI.
- Recharts para las gráficas.

## Requisitos

- Node.js compatible con Next.js 16.
- pnpm.
- Un proyecto de Supabase.

## Configuración local

1. Clona el repositorio y entra al directorio:

   ```bash
   git clone https://github.com/RomanAlejandr0/finanzas-personales-web.git
   cd finanzas-personales-web
   ```

2. Instala las dependencias:

   ```bash
   pnpm install
   ```

3. Crea `.env.local` a partir de `.env.example` y configura las credenciales de tu proyecto Supabase:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable
   ```

4. Inicia el servidor de desarrollo:

   ```bash
   pnpm dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## Comandos

```bash
pnpm dev      # Servidor de desarrollo
pnpm lint     # Revisión estática
pnpm build    # Compilación de producción
pnpm start    # Ejecuta la compilación de producción
```

## Base de datos

La aplicación necesita las tablas y funciones RPC de Supabase que usa el código para cuentas, saldos, proyecciones y compromisos. **Las migraciones de base de datos todavía no están incluidas en este repositorio**, así que configurar las variables de entorno por sí solo no crea el esquema necesario para usar todas las funciones.

No subas credenciales privadas. `.env.local` debe mantenerse local; utiliza variables de entorno protegidas para cualquier despliegue.
