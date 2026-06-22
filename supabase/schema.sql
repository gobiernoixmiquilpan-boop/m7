-- 1. Tabla de solicitudes
create table if not exists submissions (
  id                  text primary key,
  timestamp           timestamptz not null default now(),
  "nombreCompleto"    text,
  comunidad           text,
  ubicacion           text,
  lat                 double precision,
  lng                 double precision,
  celular             text,
  curp                text,
  predio              text,
  lote                text,
  "tipoTierra"        text,
  superficie          text,
  "hablaDialecto"     text,
  status              text default 'pendiente',
  "fotoCasaUrl"       text,
  "fotoINEFrenteUrl"  text,
  "fotoINEAtrasUrl"   text
);

-- Si ya creaste la tabla sin la columna status, ejecuta solo esto:
-- alter table submissions add column if not exists status text default 'pendiente';

-- 2. Deshabilitar acceso público (solo service_role puede leer/escribir)
alter table submissions enable row level security;

-- 3. Bucket para fotos
-- Storage > New bucket:
--   Nombre: solicitudes
--   Public: NO (privado) — el API genera URLs firmadas para el admin
--   Allowed MIME types: image/*
--   Max file size: 10 MB

-- ─── MIGRACIÓN v2 (ejecutar si la tabla ya existe) ───────────────────────────

-- Nuevas columnas en submissions
alter table submissions
  add column if not exists updated_at       timestamptz,
  add column if not exists "motivoRechazo"  text,
  add column if not exists notas            text;

-- Tabla de historial de estados
create table if not exists status_history (
  id             bigserial primary key,
  submission_id  text not null references submissions(id) on delete cascade,
  status         text not null,
  motivo         text,
  created_at     timestamptz not null default now()
);

alter table status_history enable row level security;

-- Índices de rendimiento
create index if not exists idx_submissions_status    on submissions(status);
create index if not exists idx_submissions_curp      on submissions(curp);
create index if not exists idx_submissions_timestamp on submissions(timestamp desc);
create index if not exists idx_submissions_comunidad on submissions(comunidad);
create index if not exists idx_status_history_sub    on status_history(submission_id);

-- ─── MIGRACIÓN v4 (soft delete + índice reset_at para limpieza) ─────────────

alter table submissions
  add column if not exists archived_at timestamptz;

-- Índice parcial: acelera el filtro "archived_at IS NULL" (vista activa)
create index if not exists idx_submissions_active on submissions(timestamp desc)
  where archived_at is null;

-- Índice en reset_at para limpieza eficiente de rate_limits
create index if not exists idx_rate_limits_expiry on rate_limits(reset_at);

-- ─── MIGRACIÓN v3 (rate limiting persistente para entornos serverless) ────────

create table if not exists rate_limits (
  key        text primary key,
  count      int  not null default 0,
  reset_at   timestamptz not null
);

alter table rate_limits enable row level security;
-- Sin políticas: service_role (servidor) bypasea RLS; clientes anónimos no pueden leer ni escribir.

-- Limpieza periódica de entradas expiradas (ejecutar manualmente si crece la tabla):
-- delete from rate_limits where reset_at < now();

-- ─── MIGRACIÓN v5 (revocación de tokens de sesión) ──────────────────────────

create table if not exists revoked_sessions (
  jti         text primary key,
  expires_at  timestamptz not null
);

alter table revoked_sessions enable row level security;
-- Sin políticas: service_role bypasea RLS; clientes anónimos no acceden.

-- Índice para limpieza eficiente de tokens expirados
create index if not exists idx_revoked_sessions_expiry on revoked_sessions(expires_at);

-- Limpieza periódica (ejecutar manualmente si crece la tabla):
-- delete from revoked_sessions where expires_at < now();

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN_PASSWORD_HASH: genera el hash con:
--   Linux/macOS: echo -n "tu-contraseña" | sha256sum
--   PowerShell:  (Get-FileHash -InputStream ([IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes("tu-contraseña"))) -Algorithm SHA256).Hash.ToLower()
-- Luego agrega ADMIN_PASSWORD_HASH=<hash-hex-64-chars> a tu .env.local
-- ─────────────────────────────────────────────────────────────────────────────
