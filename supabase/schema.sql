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
