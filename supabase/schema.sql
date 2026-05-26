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

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN_PASSWORD_HASH: genera el hash con:
--   Linux/macOS: echo -n "tu-contraseña" | sha256sum
--   PowerShell:  (Get-FileHash -InputStream ([IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes("tu-contraseña"))) -Algorithm SHA256).Hash.ToLower()
-- Luego agrega ADMIN_PASSWORD_HASH=<hash-hex-64-chars> a tu .env.local
-- ─────────────────────────────────────────────────────────────────────────────
