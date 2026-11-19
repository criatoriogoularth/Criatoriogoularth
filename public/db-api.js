// db-api.js — COMPLETO COM FUNÇÕES DE ANCESTRAIS
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

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

  // Site aberto por caminho (/c/nome/...): diz ao servidor de qual criatório é.
  const mt = location.pathname.match(/\/c\/([a-z0-9-]{3,40})\//);
  if (mt) headers['X-Tenant'] = mt[1];

  // GET nunca pode vir do cache do navegador (senão a lista antiga reaparece
  // depois de excluir/editar e só some com F5).
  const metodo = (options.method || 'GET').toUpperCase();
  let url = `${API_BASE}${path}`;
  if (metodo === 'GET') {
    url += (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  }

  const res = await fetch(url, { ...options, headers, cache: 'no-store' });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (!location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    throw new Error('Não autenticado');
  }

  const data = await res.json().catch(() => null);

  // Teste acabou / plano vencido: leva para a tela de planos
  if (res.status === 402 && data && data.codigo === 'ACESSO_BLOQUEADO' && !location.pathname.endsWith('plano.html')) {
    window.location.href = 'plano.html';
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Erro ${res.status}`);
  }
  return data;
}

const DB = {
  TABLES: {
    ANILHAS: 'anilhas',
    AVES: 'aves',
    REPRODUCOES: 'reproducoes',
    ANCESTRAIS: 'ancestrais'  // <-- ADICIONADO
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

  // ---- FUNÇÕES ESPECÍFICAS ----
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

  // ============================================================
  // ===== FUNÇÕES DE ANCESTRAIS =====
  // ============================================================
  async getAncestrais() {
    const rows = await apiFetch('/ancestrais');
    return rows;
  },

  async addAncestral(dados) {
    const row = await apiFetch('/ancestrais', {
      method: 'POST',
      body: JSON.stringify(paraSnake(dados))
    });
    return row;
  },

  async updateAncestral(id, dados) {
    const row = await apiFetch(`/ancestrais/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paraSnake(dados))
    });
    return row;
  },

  async deleteAncestral(id) {
    return apiFetch(`/ancestrais/${id}`, { method: 'DELETE' });
  },

  async getAncestralPorNome(nome) {
    if (!nome) return null;
    const ancestrais = await this.getAncestrais();
    return ancestrais.find(a => a.nome && a.nome.toLowerCase() === nome.toLowerCase()) || null;
  },

  // ---- PÚBLICO ----
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

  // ---- CONTA ----
  async trocarSenha(senhaAtual, novaSenha) {
    return apiFetch('/auth/senha', { method: 'PUT', body: JSON.stringify({ senhaAtual, novaSenha }) });
  },

  // ---- CONFIG ----
  // Páginas do SITE público leem a versão pública (só o que o visitante pode ver).
  // Páginas do GERENCIADOR leem a versão completa, pelo login — assim cada criador só enxerga o que é dele.
  async getConfig(chave) {
    const token = localStorage.getItem('token');
    const paginaPublica = /site-(home|criatorio|noticias|plantel|adultos|filhotes|fotos|videos|contato|certificado)\.html$/.test(location.pathname);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const mt = location.pathname.match(/\/c\/([a-z0-9-]{3,40})\//);
    if (mt) headers['X-Tenant'] = mt[1];

    const url = (token && !paginaPublica) ? `${API_BASE}/config/${chave}` : `${API_BASE}/config/publico/${chave}`;
    const res = await fetch(url, { headers });
    if (res.status === 402 && !location.pathname.endsWith('plano.html')) { window.location.href = 'plano.html'; return null; }
    if (!res.ok) return null;
    return res.json();
  },
  async setConfig(chave, valor) {
    return apiFetch(`/config/${chave}`, { method: 'PUT', body: JSON.stringify({ valor }) });
  },

  // ---- VISITAS ----
  async registrarVisita(pagina) {
    try {
      await fetch(`${API_BASE}/visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagina })
      });
    } catch (e) {
      // silencioso: contador de visitas nunca deve travar a navegação do site
    }
  },
  async getVisitasStats() {
    return apiFetch('/visitas/stats');
  },

  // ---- MENSAGENS DO SITE (reservas, dúvidas e contatos) ----
  async getMensagens() {
    return paraCamel(await apiFetch('/mensagens'));
  },
  async getMensagensResumo() {
    return apiFetch('/mensagens/resumo');
  },
  async marcarMensagem(id, lida) {
    return apiFetch(`/mensagens/${id}`, { method: 'PUT', body: JSON.stringify({ lida }) });
  },
  async marcarTodasMensagensLidas() {
    return apiFetch('/mensagens/ler-todas', { method: 'POST', body: JSON.stringify({}) });
  },
  async excluirMensagem(id) {
    return apiFetch(`/mensagens/${id}`, { method: 'DELETE' });
  },

  // ---- LIMITES DO PLANO e IMAGENS ----
  // Limites vêm do servidor (que é quem confere de verdade); aqui só para avisar o usuário.
  async getLimites() {
    if (!this._limites) {
      try { this._limites = (await apiFetch('/conta')).limites; }
      catch (e) { this._limites = null; }
      if (!this._limites) this._limites = { fotosAve: 3, galeria: 50, banners: 5 };
    }
    return this._limites;
  },

  // Reduz a imagem no próprio aparelho antes de enviar (foto de celular de 5 MB vira ~200 KB).
  reduzirImagem(file, maxLado = 1200, qualidade = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) return reject(new Error('O arquivo não é uma imagem.'));
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida ou formato não suportado.'));
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxLado || h > maxLado) {
            if (w >= h) { h = Math.round(h * maxLado / w); w = maxLado; } else { w = Math.round(w * maxLado / h); h = maxLado; }
          }
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d');
          cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, w, h);   // PNG transparente não vira fundo preto
          cx.drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', qualidade));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(file);
    });
  }
};

window.DB = DB;
console.log('✅ db-api.js carregado');