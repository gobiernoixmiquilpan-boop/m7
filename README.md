# RegulaTierra

Plataforma web para el registro de solicitudes de regularización de tierras del municipio de Ixmiquilpan, Hidalgo. Desarrollada para la comunidad de Capula 2026.

## Funcionalidades

- Formulario ciudadano de 7 pasos con guardado automático de borrador
- Captura de fotografías (casa e INE) desde cámara o galería
- Geolocalización opcional del predio
- Pantalla de confirmación con folio de registro (`CAP-2026-XXXX`)
- Panel administrativo protegido con contraseña
- Visualización de solicitudes en mapa interactivo (Leaflet)
- Gráficas estadísticas por comunidad, tipo de tierra y dialecto
- Exportación a CSV
- Aplicación web progresiva (PWA) instalable en celular

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/) — base de datos y almacenamiento de fotos
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) — gráficas
- [React Leaflet](https://react-leaflet.js.org/) — mapa

## Configuración

Crea un archivo `.env.local` en la raíz del proyecto:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_PASS=<contraseña-del-panel-admin>
```

### Base de datos (Supabase)

Ejecuta el script `supabase/schema.sql` en el SQL Editor de tu proyecto Supabase.

Crea un bucket de Storage llamado `solicitudes` (privado, solo `image/*`, máx 10 MB).

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

El panel admin está en [http://localhost:3000/admin](http://localhost:3000/admin).

## Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno en **Settings → Environment Variables**
3. Deploy

## Licencia

Uso institucional — Contraloría Municipal de Ixmiquilpan, Hidalgo.
