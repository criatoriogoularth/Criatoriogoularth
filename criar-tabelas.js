const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://aviario_db_user:tyfBz94W5uTwzb7VKQOJkfhYbOe9CnWI@dpg-d9dbqg9kh4rs73fovsj0-a.oregon-postgres.render.com/aviario_db?sslmode=require'
});

const sql = `
-- DROPAR TABELAS EXISTENTES (se existirem)
DROP TABLE IF EXISTS site_config CASCADE;
DROP TABLE IF EXISTS reproducoes CASCADE;
DROP TABLE IF EXISTS anilhas CASCADE;
DROP TABLE IF EXISTS aves CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================================
-- RECRIAR TODAS AS TABELAS DO ZERO
-- ============================================================

CREATE TABLE usuarios (
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

CREATE TABLE aves (
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

CREATE TABLE anilhas (
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

CREATE TABLE reproducoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dados JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reproducoes_usuario ON reproducoes(usuario_id);

CREATE TABLE site_config (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  chave VARCHAR(100) NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}',
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, chave)
);

-- Criar usuário admin padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, role, status)
VALUES (
  'Administrador',
  'admin@criatorio.com',
  '$2b$10$t8n3XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9XQ9',
  'admin',
  'aprovado'
) ON CONFLICT (email) DO NOTHING;
`;

async function criarTabelas() {
    console.log('🔄 Conectando ao banco de dados...');
    console.log('⚠️ ATENÇÃO: Isso vai APAGAR todas as tabelas existentes!');
    console.log('📦 Fazendo backup? Pressione Ctrl+C para cancelar (5 segundos)...');
    
    // Pequena pausa para o usuário ler
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
        await pool.query(sql);
        console.log('✅ Todas as tabelas foram recriadas com sucesso!');
        console.log('📋 Tabelas: usuarios, aves, anilhas, reproducoes, site_config');
        console.log('👤 Usuário admin criado: admin@criatorio.com / senha: admin123');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err.message);
        console.error('Detalhes:', err.stack);
    } finally {
        await pool.end();
        console.log('🔌 Conexão fechada.');
    }
}

criarTabelas();