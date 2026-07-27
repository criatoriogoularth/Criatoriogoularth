// routes/aves.js
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const CAMPOS = [
  'nome', 'anilha', 'sexo', 'especie', 'raca', 'data_nasc', 'situacao', 'tipo',
  'manejo', 'gaiola', 'mutacao', 'pai', 'anilha_pai', 'mae', 'anilha_mae',
  'avo_paterno', 'avo_paterna', 'avo_materno', 'avo_materna', 'filhote',
  'no_site', 'categoria_site', 'status_site', 'ancestrais', 'historico'
];

// Colunas JSONB que guardam um ARRAY
const CAMPOS_JSON_ARRAY = new Set(['ancestrais', 'historico']);
const CAMPOS_BOOLEAN = new Set(['filhote', 'no_site']);
const CAMPOS_DATE = new Set(['data_nasc']);
const CAMPOS_NUMERIC = new Set([]); // se tiver algum campo numérico no futuro

/**
 * LIMPA E PREPARA QUALQUER VALOR PARA O BANCO
 * - Strings vazias → null
 * - undefined → null
 * - Arrays → JSON.stringify (para JSONB)
 * - Booleanos → mantém como boolean
 * - Datas vazias → null
 * - null/undefined com fallback para arrays vazios
 */
function prepararValor(campo, valor) {
  // 1. TRATA UNDEFINED E STRING VAZIA
  if (valor === undefined) {
    return getDefaultForField(campo);
  }
  
  if (typeof valor === 'string' && valor.trim() === '') {
    // Se for string vazia, verifica se é um campo que precisa de valor especial
    if (CAMPOS_JSON_ARRAY.has(campo)) {
      return JSON.stringify([]);
    }
    if (CAMPOS_DATE.has(campo)) {
      return null; // data vazia → null
    }
    if (CAMPOS_BOOLEAN.has(campo)) {
      return false; // boolean vazio → false
    }
    return null; // outros campos string vazia → null
  }

  // 2. TRATA CAMPOS JSON (arrays)
  if (CAMPOS_JSON_ARRAY.has(campo)) {
    if (valor === null) return JSON.stringify([]);
    if (Array.isArray(valor)) return JSON.stringify(valor);
    if (typeof valor === 'string') {
      try {
        // Se veio como string JSON, faz parse e serializa de novo
        const parsed = JSON.parse(valor);
        return JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch {
        return JSON.stringify([]);
      }
    }
    return JSON.stringify([]);
  }

  // 3. TRATA CAMPOS BOOLEANOS
  if (CAMPOS_BOOLEAN.has(campo)) {
    if (typeof valor === 'boolean') return valor;
    if (valor === 'true' || valor === '1' || valor === 1) return true;
    if (valor === 'false' || valor === '0' || valor === 0) return false;
    return false; // padrão
  }

  // 4. TRATA CAMPOS DE DATA
  if (CAMPOS_DATE.has(campo)) {
    if (valor === null) return null;
    if (typeof valor === 'string' && valor.trim() === '') return null;
    // Tenta criar uma data válida
    const date = new Date(valor);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    return null;
  }

  // 5. TRATA CAMPOS NUMÉRICOS (se houver)
  if (CAMPOS_NUMERIC.has(campo)) {
    const num = Number(valor);
    return isNaN(num) ? null : num;
  }

  // 6. QUALQUER OUTRO CAMPO - retorna o valor limpo
  if (typeof valor === 'string') {
    return valor.trim() || null;
  }
  return valor;
}

function getDefaultForField(campo) {
  if (CAMPOS_JSON_ARRAY.has(campo)) return JSON.stringify([]);
  if (CAMPOS_BOOLEAN.has(campo)) return false;
  if (CAMPOS_DATE.has(campo)) return null;
  return null;
}

function linhaParaAve(row) {
  return row;
}

// ---------- ROTAS PRIVADAS ----------

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM aves WHERE usuario_id = $1 ORDER BY id',
    [req.user.id]
  );
  res.json(rows.map(linhaParaAve));
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM aves WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json(linhaParaAve(rows[0]));
}));

router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const body = req.body || {};
  
  // Validação básica
  if (!body.nome || (typeof body.nome === 'string' && body.nome.trim() === '')) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!body.anilha || (typeof body.anilha === 'string' && body.anilha.trim() === '')) {
    return res.status(400).json({ error: 'Anilha é obrigatória.' });
  }

  // Impede duplicar anilha
  const dup = await pool.query(
    'SELECT id FROM aves WHERE anilha = $1 AND usuario_id = $2',
    [body.anilha.trim(), req.user.id]
  );
  if (dup.rows.length > 0) {
    return res.status(409).json({ error: 'Esta anilha já está sendo usada por outra ave.' });
  }

  // Prepara todos os campos com a função de limpeza
  const cols = ['usuario_id', ...CAMPOS];
  const valores = [
    req.user.id,
    ...CAMPOS.map(c => prepararValor(c, body[c]))
  ];
  const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO aves (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    valores
  );
  res.status(201).json(linhaParaAve(rows[0]));
}));

router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const body = req.body || {};

  // Verifica duplicidade se estiver mudando a anilha
  if (body.anilha && typeof body.anilha === 'string' && body.anilha.trim() !== '') {
    const dup = await pool.query(
      'SELECT id FROM aves WHERE anilha = $1 AND usuario_id = $2 AND id != $3',
      [body.anilha.trim(), req.user.id, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Esta anilha já está sendo usada por outra ave.' });
    }
  }

  // Filtra apenas campos que foram enviados
  const camposEnviados = CAMPOS.filter(c => body[c] !== undefined);
  if (camposEnviados.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  // Prepara cada campo com a função de limpeza
  const sets = camposEnviados.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const valores = camposEnviados.map(c => prepararValor(c, body[c]));
  valores.push(req.params.id, req.user.id);

  const { rows } = await pool.query(
    `UPDATE aves SET ${sets}, atualizado_em = NOW()
     WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length}
     RETURNING *`,
    valores
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json(linhaParaAve(rows[0]));
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM aves WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json({ ok: true });
}));

// ---------- ROTAS PÚBLICAS ----------

router.get('/publico/site', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, nome, anilha, sexo, especie, raca,
            data_nasc AS "dataNasc", pai, mae,
            categoria_site AS "categoria", status_site AS "status"
     FROM aves WHERE no_site = true ORDER BY especie, nome`
  );
  res.json(rows);
}));

router.get('/publico/certificado/:id', asyncHandler(async (req, res) => {
  const aveRes = await pool.query(
    `SELECT id, nome, anilha, sexo, especie, raca,
            data_nasc AS "dataNasc", pai, anilha_pai AS "anilhaPai",
            mae, anilha_mae AS "anilhaMae",
            avo_paterno AS "avoPaterno", avo_paterna AS "avoPaterna",
            avo_materno AS "avoMaterno", avo_materna AS "avoMaterna",
            ancestrais
     FROM aves WHERE id = $1 AND no_site = true`,
    [req.params.id]
  );
  const ave = aveRes.rows[0];
  if (!ave) return res.status(404).json({ error: 'Certificado não disponível.' });

  async function buscarPorNome(nome) {
    if (!nome || nome === ave.nome) return null;
    const r = await pool.query(
      `SELECT nome, anilha, pai, anilha_pai AS "anilhaPai", mae, anilha_mae AS "anilhaMae"
       FROM aves WHERE nome = $1 LIMIT 1`,
      [nome]
    );
    return r.rows[0] || null;
  }

  const paiEncontrado = await buscarPorNome(ave.pai);
  const maeEncontrada = await buscarPorNome(ave.mae);

  res.json({ ...ave, paiEncontrado, maeEncontrada });
}));

module.exports = router;