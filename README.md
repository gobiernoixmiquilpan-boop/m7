# RegulaTierra · Capula 2026

Plataforma web para el registro y gestión de solicitudes de regularización de tierras del municipio de Ixmiquilpan, Hidalgo. Desarrollada para las comunidades de Capula y San Pedro Capula, 2026.

## Funcionalidades

### Ciudadano
- Formulario de 7 pasos con guardado automático de borrador en `localStorage`
- Captura de fotografías (casa e INE frente/reverso) con compresión automática
- Geolocalización opcional del predio con detección automática del lote más cercano
- Mapa interactivo de lotes: selección táctil, vista satélite, fly-to GPS y al lote seleccionado
- Soporte offline completo: cola persistente que se envía automáticamente al recuperar señal
- Pantalla de confirmación con folio de registro (`CAP-2026-XXXXXX`)
- Consulta de estado por folio con historial de búsquedas
- PWA instalable en Android/iOS sin tienda de aplicaciones

### Panel administrativo
- Autenticación con credenciales en variables de entorno + rate limiting (5 intentos / 15 min)
- Tabla paginada (20 reg/pág) con búsqueda, filtros por comunidad, estado y periodo, y ordenamiento
- Mapa admin con marcadores por estado (pendiente/revisión/aprobado/rechazado), auto-encuadre y polígonos de lotes con conteo de solicitudes
- Gráficas: solicitudes por comunidad, por lote, tipo de tierra y uso de lengua ñhañhu
- Gestión de estado por solicitud (pendiente → revisión → aprobado / rechazado)
- Visor de fotografías con lightbox
- Enlace directo a WhatsApp del solicitante
- Impresión / exportación PDF por expediente
- Exportación masiva a CSV con protección de fórmulas
- Actualización en tiempo real vía SSE (Supabase Realtime)
- Sesiones firmadas con HMAC-SHA256 (sin estado en servidor, compatibles con App Router)

## Stack

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) · App Router · Turbopack |
| Base de datos / Storage | [Supabase](https://supabase.com/) |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) |
| Mapa | [React Leaflet 5](https://react-leaflet.js.org/) + OSM + Esri Satélite |
| Gráficas | [Recharts](https://recharts.org/) |
| Íconos | [Lucide React](https://lucide.dev/) |

## Variables de entorno

Crea `.env.local` en la raíz:

```env
# Supabase — Settings > API
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Panel admin
ADMIN_EMAIL=admin@ejemplo.com
ADMIN_PASSWORD_HASH=<sha256(contraseña + AUTH_SALT)>
AUTH_SALT=<cadena-secreta-aleatoria>
```

Para generar `ADMIN_PASSWORD_HASH` con Node:

```bash
node -e "const {createHash}=require('crypto'); console.log(createHash('sha256').update('TuContraseña' + 'TuSalt').digest('hex'));"
```

## Base de datos (Supabase)

Ejecuta `supabase/schema.sql` en el SQL Editor de tu proyecto.

Crea un bucket de Storage llamado `solicitudes` (privado, solo `image/*`, máx 10 MB).

## Desarrollo local

```bash
npm install
npm run dev
```

- App ciudadana: [http://localhost:3000](http://localhost:3000)
- Panel admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno en **Settings → Environment Variables**
3. Deploy automático en cada push a `main`

## Licencia

Uso institucional — Contraloría Municipal de Ixmiquilpan, Hidalgo.
