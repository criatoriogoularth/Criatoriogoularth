-- ============================================================
-- BANCO MESTRE — Aviari
-- Guarda só o que é "da plataforma": quem são os clientes, logins,
-- planos, convites, auditoria e sugestões. Os DADOS de cada criatório
-- (aves, fotos, site...) ficam em um banco SEPARADO por cliente
-- (db/tenant-schema.sql) — o endereço desse banco fica cifrado aqui.
-- Rode com:  node scripts/init-master.js
-- ============================================================

CREATE TABLE IF NOT EXISTS planos (
  id VARCHAR(30) PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  descricao TEXT,
  gerenciador VARCHAR(12) NOT NULL DEFAULT 'completo',   -- completo | reduzido | nenhum
  site BOOLEAN NOT NULL DEFAULT true,
  dominio_proprio BOOLEAN NOT NULL DEFAULT false,
  imprimir BOOLEAN NOT NULL DEFAULT true,
  limite_galeria_subdominio INTEGER NOT NULL DEFAULT 50,
  limite_galeria_dominio INTEGER NOT NULL DEFAULT 80,
  limite_fotos_ave INTEGER NOT NULL DEFAULT 3,
  limite_aves INTEGER,                                    -- NULL = sem limite
  dias_teste INTEGER,                                     -- só para o plano de teste
  preco_anual_centavos INTEGER,                           -- NULL = ainda não definido
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(40) UNIQUE NOT NULL,                       -- fulano  -> fulano.SEUDOMINIO
  nome VARCHAR(160) NOT NULL,                             -- nome do criatório
  plano_id VARCHAR(30) NOT NULL REFERENCES planos(id),
  status VARCHAR(12) NOT NULL DEFAULT 'teste',            -- teste | ativo | vencido | suspenso
  trial_fim TIMESTAMPTZ,
  plano_fim TIMESTAMPTZ,                                  -- fim da anuidade paga
  carencia_dias INTEGER NOT NULL DEFAULT 5,
  dominio_proprio VARCHAR(255) UNIQUE,
  dominio_ativo BOOLEAN NOT NULL DEFAULT false,
  espaco_extra_fotos INTEGER NOT NULL DEFAULT 0,          -- pacotes extras comprados
  db_url_enc TEXT NOT NULL,                               -- URL do banco do cliente (cifrada)
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contas (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,   -- NULL = dono da plataforma
  usuario_tenant_id INTEGER NOT NULL DEFAULT 1,                 -- id do usuário dentro do banco do cliente
  role VARCHAR(10) NOT NULL DEFAULT 'cliente',                  -- cliente | dono
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  cpf_hmac VARCHAR(64),                                         -- para login por CPF (não reversível)
  cpf_enc TEXT,                                                 -- CPF cifrado (só p/ cobrança futura)
  aceite_termos_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_email ON contas (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_cpf ON contas (cpf_hmac) WHERE cpf_hmac IS NOT NULL;

CREATE TABLE IF NOT EXISTS convites (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(64) UNIQUE NOT NULL,                 -- só o hash fica guardado
  plano_id VARCHAR(30) NOT NULL REFERENCES planos(id),
  dias_teste INTEGER,                                     -- sobrepõe o padrão do plano
  email_destino VARCHAR(255),
  db_url_enc TEXT,                                        -- banco já criado (ex.: projeto do Neon)
  observacao VARCHAR(255),
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  criado_por INTEGER REFERENCES contas(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sugestoes (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'sugestao',           -- problema | sugestao | duvida
  pagina VARCHAR(200),
  texto TEXT NOT NULL,
  resolvida BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tudo que o dono da plataforma faz sobre um cliente fica registrado aqui.
CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER REFERENCES contas(id) ON DELETE SET NULL,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  acao VARCHAR(60) NOT NULL,
  detalhe JSONB NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planos (id, nome, descricao, gerenciador, site, dominio_proprio, imprimir,
                    limite_galeria_subdominio, limite_galeria_dominio, limite_fotos_ave, dias_teste, ordem) VALUES
  ('teste',          'Teste grátis',        'Tudo liberado, com endereço no subdomínio, por tempo limitado.', 'completo', true,  false, true,  50, 50, 3, 20, 0),
  ('completo',       'Completo',            'Gerenciador + site. Domínio próprio opcional.',                  'completo', true,  true,  true,  50, 80, 3, NULL, 1),
  ('so_gerenciador', 'Só gerenciador',      'Gerenciador do criatório, sem site público.',                    'completo', false, false, true,  50, 80, 3, NULL, 2),
  ('so_site',        'Só site',             'Site público com cadastro de aves e árvore. Sem impressão.',     'reduzido', true,  true,  false, 50, 80, 3, NULL, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- E-MAIL, RECUPERAÇÃO DE SENHA, AVISOS E PAGAMENTOS
-- ============================================================
ALTER TABLE contas ADD COLUMN IF NOT EXISTS email_confirmado_em TIMESTAMPTZ;

-- Links de uso único (redefinir senha / confirmar e-mail). Só o hash fica guardado.
CREATE TABLE IF NOT EXISTS tokens_conta (
  id SERIAL PRIMARY KEY,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  tipo VARCHAR(12) NOT NULL,                              -- reset | confirmar
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registro dos e-mails enviados. O CORPO só é guardado no "modo de teste" (sem provedor de e-mail
-- configurado), para o dono poder pegar os links. Com provedor real, só fica o resumo.
CREATE TABLE IF NOT EXISTS emails_log (
  id SERIAL PRIMARY KEY,
  para VARCHAR(255) NOT NULL,
  assunto VARCHAR(255) NOT NULL,
  corpo TEXT,
  enviado BOOLEAN NOT NULL DEFAULT false,
  erro VARCHAR(500),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evita mandar o mesmo aviso de vencimento duas vezes.
CREATE TABLE IF NOT EXISTS avisos_enviados (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  referencia VARCHAR(40) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, tipo, referencia)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plano_id VARCHAR(30) NOT NULL REFERENCES planos(id),
  valor_centavos INTEGER,
  meses INTEGER NOT NULL DEFAULT 12,
  origem VARCHAR(20) NOT NULL DEFAULT 'manual',           -- manual | asaas | outro
  referencia_externa VARCHAR(120),
  observacao VARCHAR(255),
  registrado_por INTEGER REFERENCES contas(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pagamentos_ref ON pagamentos (origem, referencia_externa) WHERE referencia_externa IS NOT NULL;
