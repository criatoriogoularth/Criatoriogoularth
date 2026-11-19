-- ============================================================
-- SCHEMA DO BANCO DE CADA CRIATÓRIO (um banco por cliente) — Aviari
-- É aplicado sozinho quando o banco do cliente é usado pela 1ª vez
-- (db/tenants.js). Tudo aqui é "IF NOT EXISTS": pode rodar quantas
-- vezes quiser sem estragar nada.
-- Dentro de cada banco o dono é SEMPRE o usuário id = 1.
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
  fotos JSONB NOT NULL DEFAULT '[]',
  video_url VARCHAR(500),
  cig_numero VARCHAR(100),
  cig_arquivo TEXT,
  sexagem_arquivo TEXT,
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


CREATE TABLE IF NOT EXISTS site_mensagens (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL DEFAULT 1,
  tipo VARCHAR(20) NOT NULL DEFAULT 'contato',
  nome VARCHAR(120) NOT NULL,
  contato VARCHAR(160) NOT NULL,
  assunto VARCHAR(200),
  mensagem TEXT,
  ave_id INTEGER,
  ave_nome VARCHAR(160),
  lida BOOLEAN NOT NULL DEFAULT false,
  ip_hash VARCHAR(40),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AJUSTES IDEMPOTENTES (bancos antigos recebem as colunas novas sozinhos)
-- ============================================================
ALTER TABLE aves
  ADD COLUMN IF NOT EXISTS fotos JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS video_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cig_numero VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cig_arquivo TEXT,
  ADD COLUMN IF NOT EXISTS sexagem_arquivo TEXT;

-- Reprodução finalizada não pode ficar "Ativo" (bug antigo): corrige o que já existe.
UPDATE reproducoes SET status = 'Finalizado' WHERE dados->>'finalizada' = 'Sim' AND status <> 'Finalizado';

-- CIG e laudo de sexagem só aparecem no site se o criador marcar "mostrar" em cada ave.
-- Bancos antigos: quem já tinha documento publicado continua publicado (feito UMA vez, quando a coluna nasce).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aves' AND column_name = 'mostrar_cig') THEN
    ALTER TABLE aves ADD COLUMN mostrar_cig BOOLEAN NOT NULL DEFAULT false,
                     ADD COLUMN mostrar_sexagem BOOLEAN NOT NULL DEFAULT false;
    UPDATE aves SET mostrar_cig = true
      WHERE (cig_numero IS NOT NULL AND cig_numero <> '') OR (cig_arquivo IS NOT NULL AND cig_arquivo <> '');
    UPDATE aves SET mostrar_sexagem = true WHERE sexagem_arquivo IS NOT NULL AND sexagem_arquivo <> '';
  END IF;
END $$;
