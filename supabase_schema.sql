-- Ejecutar en el SQL Editor de Supabase

create table centros_acopio (
  id bigint primary key generated always as identity,
  nombre text not null,
  direccion text not null,
  zona text not null,
  horario text not null,
  que_acepta text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);

-- Permitir lectura pública
alter table centros_acopio enable row level security;

create policy "Lectura pública" on centros_acopio
  for select using (activo = true);

create policy "Solo service role puede escribir" on centros_acopio
  for all using (auth.role() = 'service_role');

-- Negocios que donan parte de sus ventas
create table negocios_solidarios (
  id bigint primary key generated always as identity,
  nombre text not null,
  tipo text not null,
  iniciativa text not null,
  zona text not null,
  direccion text,
  instagram text,
  sitio_web text,
  vigencia text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table negocios_solidarios enable row level security;

create policy "Lectura pública negocios" on negocios_solidarios
  for select using (activo = true);

create policy "Solo service role puede escribir negocios" on negocios_solidarios
  for all using (auth.role() = 'service_role');
