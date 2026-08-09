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

-- ============================================================
-- TABELA DE ANCESTRAIS (NÃO FAZEM PARTE DO PLANTEL)
-- ============================================================
CREATE TABLE IF NOT EXISTS ancestrais (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  anilha VARCHAR(100),
  sexo VARCHAR(20) NOT NULL,
  especie VARCHAR(255),
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ancestrais_usuario ON ancestrais(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ancestrais_nome ON ancestrais(nome);
CREATE INDEX IF NOT EXISTS idx_ancestrais_anilha ON ancestrais(anilha);

-- ============================================================
-- CONTADOR DE VISITANTES DO SITE PÚBLICO
-- ============================================================
-- Uma linha por visita (contada 1x por sessão de navegador — ver
-- site-buttons.js). "data" já vem separado de criado_em pra deixar
-- a consulta "quantas visitas hoje / por dia" simples e rápida,
-- sem precisar truncar timestamp toda hora.
CREATE TABLE IF NOT EXISTS site_visitas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pagina VARCHAR(100),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitas_usuario_data ON site_visitas(usuario_id, data);

-- ============================================================
-- COPAS / TORNEIOS DO SITE PÚBLICO (categorias + links de etapa)
-- ============================================================
-- Cada linha é UM LINK dentro de UMA CATEGORIA (ex: categoria = "Copa
-- ABCO Livre Adulto 2026", etapa = "1ª Etapa - 18/04/2026"). O
-- resultado em si é uma imagem ou PDF pronto que o admin sobe
-- (arquivo_url + arquivo_tipo) — mesmo padrão de site_banners e
-- site_especies. Não existe mais tabela de posição/ave/anilha/tempo/
-- pontos editável linha a linha; a coluna "resultados" abaixo é
-- legado (não é mais lida nem escrita pelo sistema) e fica só pra não
-- quebrar quem já tinha dados antigos nela.
CREATE TABLE IF NOT EXISTS site_torneios (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria VARCHAR(255) NOT NULL,
  etapa VARCHAR(255) NOT NULL,
  data DATE,
  visivel BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  arquivo_url TEXT,
  arquivo_tipo VARCHAR(20), -- 'imagem' ou 'pdf'
  resultados JSONB NOT NULL DEFAULT '[]', -- legado, não usado mais
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_torneios_usuario ON site_torneios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_torneios_categoria ON site_torneios(categoria);