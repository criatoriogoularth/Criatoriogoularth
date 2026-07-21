// db-api.js — SUBSTITUI o antigo db.js (localStorage) por chamadas reais à API.
//
// IMPORTANTE PARA QUEM FOR ADAPTAR AS PÁGINAS HTML:
// Antes: const aves = DB.getAll(DB.TABLES.AVES);              (síncrono)
// Agora: const aves = await DB.getAll(DB.TABLES.AVES);        (precisa de await!)
//
// Toda função do DB agora devolve uma Promise. Isso significa que qualquer
// função que chame DB.getAll/add/update/delete precisa virar `async function`
// e usar `await` na chamada. É a única mudança estrutural exigida nas páginas.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

// Os formulários antigos usam camelCase (dataNasc, anilhaPai, avoPaterno...),
// o banco usa snake_case (data_nasc, anilha_pai, avo_paterno...). Em vez de
// reescrever campo por campo em cada tela, convertemos automaticamente aqui.
function paraSnake(obj) {
  if (Array.isArray(obj) || obj === null || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    out[snake] = v;
  }
  return out;
}

function paraCamel(obj) {
  if (Array.isArray(obj)) return obj.map(paraCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Sessão expirada/inválida — manda pro login
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (!location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    throw new Error('Não autenticado');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Erro ${res.status}`);
  }
  return data;
}

const DB = {
  TABLES: {
    ANILHAS: 'anilhas',
    AVES: 'aves',
    REPRODUCOES: 'reproducoes'
  },

  async getAll(table) {
    const rows = await apiFetch(`/${table}`);
    return paraCamel(rows);
  },

  async getById(table, id) {
    const row = await apiFetch(`/${table}/${id}`);
    return paraCamel(row);
  },

  async add(table, item) {
    const row = await apiFetch(`/${table}`, { method: 'POST', body: JSON.stringify(paraSnake(item)) });
    return paraCamel(row);
  },

  async update(table, id, item) {
    const row = await apiFetch(`/${table}/${id}`, { method: 'PUT', body: JSON.stringify(paraSnake(item)) });
    return paraCamel(row);
  },

  async delete(table, id) {
    return apiFetch(`/${table}/${id}`, { method: 'DELETE' });
  },

  // ---- Funções específicas que várias páginas já usavam ----
  async getAvesPorSituacao(situacao) {
    const aves = await this.getAll(this.TABLES.AVES);
    return aves.filter(a => a.situacao === situacao);
  },
  async getAvesPlantel() {
    return this.getAvesPorSituacao('Plantel');
  },
  async getAnilhasDisponiveis() {
    const anilhas = await this.getAll(this.TABLES.ANILHAS);
    return anilhas.filter(a => a.disponivel === 'Sim' && a.ativo === 'Sim');
  },
  async getReproducoesAtivas() {
    const reproducoes = await this.getAll(this.TABLES.REPRODUCOES);
    return reproducoes.filter(r => r.status === 'Ativo');
  },
  async getAvePorAnilha(anilha) {
    if (!anilha) return null;
    const aves = await this.getAll(this.TABLES.AVES);
    return aves.find(a => a.anilha && a.anilha.toLowerCase() === anilha.toLowerCase()) || null;
  },
  async getAvePorNome(nome) {
    if (!nome) return null;
    const aves = await this.getAll(this.TABLES.AVES);
    return aves.find(a => a.nome && a.nome.toLowerCase() === nome.toLowerCase()) || null;
  },
  async getAnilhaPorNumero(numero) {
    if (!numero) return null;
    const anilhas = await this.getAll(this.TABLES.ANILHAS);
    return anilhas.find(a => a.numero === numero) || null;
  },

  // ---- Leitura pública das aves marcadas para aparecer no site (sem login) ----
  async getAvesPublicas() {
    const res = await fetch(`${API_BASE}/aves/publico/site`);
    if (!res.ok) return [];
    return res.json();
  },
  async getCertificadoPublico(id) {
    const res = await fetch(`${API_BASE}/aves/publico/certificado/${id}`);
    if (!res.ok) return null;
    return paraCamel(await res.json());
  },

  // ---- Conta do usuário ----
  async trocarSenha(senhaAtual, novaSenha) {
    return apiFetch('/auth/senha', { method: 'PUT', body: JSON.stringify({ senhaAtual, novaSenha }) });
  },

  // ---- Config do site (substitui os antigos localStorage 'site_xxx') ----
  async getConfig(chave) {
    const res = await fetch(`${API_BASE}/config/publico/${chave}`);
    if (!res.ok) return null;
    return res.json();
  },
  async setConfig(chave, valor) {
    return apiFetch(`/config/${chave}`, { method: 'PUT', body: JSON.stringify({ valor }) });
  }
};

window.DB = DB;
console.log('✅ db-api.js carregado (API real, sem localStorage)');
