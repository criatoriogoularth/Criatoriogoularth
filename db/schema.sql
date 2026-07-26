-- ============================================================
-- SCHEMA DO BANCO — Sistema Criatório Goularth
-- Rode este arquivo uma vez no seu Postgres:
--   psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  cpf VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  criatorio VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'aprovado',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aves (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  anilha VARCHAR(100),
  sexo VARCHAR(20),
  especie VARCHAR(255),
  raca VARCHAR(255),
  data_nasc DATE,
  situacao VARCHAR(50),
  tipo VARCHAR(50),
  manejo VARCHAR(50),
  gaiola VARCHAR(100),
  mutacao VARCHAR(255),
  pai VARCHAR(255),
  anilha_pai VARCHAR(100),
  mae VARCHAR(255),
  anilha_mae VARCHAR(100),
  avo_paterno VARCHAR(255),
  avo_paterna VARCHAR(255),
  avo_materno VARCHAR(255),
  avo_materna VARCHAR(255),
  filhote BOOLEAN NOT NULL DEFAULT false,
  no_site BOOLEAN NOT NULL DEFAULT false,
  categoria_site VARCHAR(50),
  status_site VARCHAR(50) DEFAULT 'Disponível',
  ancestrais JSONB NOT NULL DEFAULT '[]',
  historico JSONB NOT NULL DEFAULT '[]',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aves_usuario ON aves(usuario_id);
CREATE INDEX IF NOT EXISTS idx_aves_anilha ON aves(anilha);

CREATE TABLE IF NOT EXISTS anilhas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cor VARCHAR(50),
  tipo VARCHAR(50),
  numero VARCHAR(100) NOT NULL,
  dimensao VARCHAR(50),
  observacao TEXT,
  data_cadastro DATE,
  disponivel VARCHAR(10) NOT NULL DEFAULT 'Sim',
  ativo VARCHAR(10) NOT NULL DEFAULT 'Sim',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anilhas_usuario ON anilhas(usuario_id);

CREATE TABLE IF NOT EXISTS reproducoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dados JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reproducoes_usuario ON reproducoes(usuario_id);

-- Guarda tudo que antes era um localStorage.setItem('site_xxx', ...)
-- em formato chave/valor JSON — troca é praticamente 1 para 1 no front-end.
CREATE TABLE IF NOT EXISTS site_config (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  chave VARCHAR(100) NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}',
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, chave)
);
