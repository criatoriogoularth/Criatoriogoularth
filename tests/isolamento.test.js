// tests/isolamento.test.js
// Teste de ponta a ponta com Postgres de verdade: tenta "furar" o isolamento entre criatórios,
// o bloqueio do teste/plano e as regras de convite. Rode:  npm test
// Precisa de um Postgres com um usuário que possa CREATE DATABASE (variável TEST_ADMIN_URL).
const { Client } = require('pg');
const assert = require('assert');

const ADMIN = process.env.TEST_ADMIN_URL || 'postgresql://postgres:pg@localhost:5432/postgres';
const MASTER_DB = 'aviari_t_mestre';
const url = (db) => { const u = new URL(ADMIN); u.pathname = '/' + db; return u.toString(); };

let ok = 0, falhas = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✅', nome); }
  catch (e) { falhas.push(nome); console.log('  ❌', nome, '\n      ', e.message.split('\n')[0]); }
}

(async () => {
  const adm = new Client({ connectionString: ADMIN }); await adm.connect();
  const drop = async () => {
    const { rows } = await adm.query(`SELECT datname FROM pg_database WHERE datname LIKE 'aviari\\_t\\_%' OR datname LIKE 'aviari\\_fazenda%' OR datname LIKE 'aviari\\_sitio%' OR datname LIKE 'aviari\\_expirado%'`);
    for (const r of rows) await adm.query(`DROP DATABASE IF EXISTS "${r.datname}" WITH (FORCE)`);
  };
  await drop();
  await adm.query(`CREATE DATABASE ${MASTER_DB}`);

  Object.assign(process.env, {
    MASTER_DATABASE_URL: url(MASTER_DB), ADMIN_DATABASE_URL: ADMIN, PGSSL: 'false',
    JWT_SECRET: 'teste-jwt-secret-bem-longo-para-o-teste-0123456789',
    APP_KEY: 'teste-app-key-com-mais-de-trinta-e-dois-caracteres-ok',
    BASE_DOMAIN: 'teste.local', APP_URL: 'http://x', DEFAULT_TENANT_SLUG: '', ASAAS_WEBHOOK_TOKEN: 'segredo-do-webhook-de-teste'
  });
  const fs = require('fs'), path = require('path'), bcrypt = require('bcrypt');
  const master = require('../db/masterPool');
  await master.query(fs.readFileSync(path.join(__dirname, '../db/master.sql'), 'utf8'));
  await master.query(`INSERT INTO contas (tenant_id, role, nome, email, senha_hash) VALUES (NULL,'dono','Dono','dono@x.com',$1)`, [await bcrypt.hash('DonoSenha123', 4)]);

  const app = require('../server');
  const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}`;
  const http = require('http');
  const api = (m, p, { tok, body, h = {} } = {}) => new Promise((resolve, reject) => {
    const dados = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...h };
    if (dados) headers['Content-Length'] = Buffer.byteLength(dados);
    const rq = http.request({ host: '127.0.0.1', port: srv.address().port, method: m, path: p, headers }, (r) => {
      let t = ''; r.on('data', (c) => (t += c));
      r.on('end', () => { let j = t; try { j = JSON.parse(t); } catch (e) { /* texto */ } resolve({ s: r.statusCode, j, t }); });
    });
    rq.on('error', reject);
    if (dados) rq.write(dados);
    rq.end();
  });

  console.log('\n— Dono e convites');
  let dono, A, B, convA, convB;
  await teste('dono entra e vai para o painel do dono', async () => {
    const r = await api('POST', '/api/auth/login', { body: { identificador: 'dono@x.com', senha: 'DonoSenha123' } });
    assert.equal(r.s, 200); assert.equal(r.j.redirect, 'dono.html'); dono = r.j.token;
  });
  await teste('login com senha errada é recusado', async () => {
    assert.equal((await api('POST', '/api/auth/login', { body: { identificador: 'dono@x.com', senha: 'errada123' } })).s, 401);
  });
  await teste('só o dono cria convites', async () => {
    assert.equal((await api('POST', '/api/dono/convites', { body: {} })).s, 401);
  });
  await teste('dono cria 2 convites de teste (20 dias)', async () => {
    convA = (await api('POST', '/api/dono/convites', { tok: dono, body: { plano_id: 'teste' } })).j.link.split('convite=')[1];
    convB = (await api('POST', '/api/dono/convites', { tok: dono, body: { plano_id: 'teste' } })).j.link.split('convite=')[1];
    assert(convA && convB && convA !== convB);
  });

  console.log('\n— Cadastro por convite');
  const dados = (o) => ({ nome: 'Fulano', criatorio: 'Fazenda A', email: 'a@x.com', slug: 'fazenda-a', senha: 'SenhaForte1', cpf: '529.982.247-25', aceite: true, ...o });
  await teste('convite inválido é recusado', async () => {
    assert.equal((await api('GET', '/api/cadastro/convite/' + 'x'.repeat(30))).s, 404);
  });
  await teste('endereço reservado (admin) é recusado', async () => {
    assert.equal((await api('POST', '/api/cadastro/convite/' + convA, { body: dados({ slug: 'admin' }) })).s, 400);
  });
  await teste('CPF inválido é recusado', async () => {
    assert.equal((await api('POST', '/api/cadastro/convite/' + convA, { body: dados({ cpf: '111.111.111-11' }) })).s, 400);
  });
  await teste('sem aceitar os termos é recusado', async () => {
    assert.equal((await api('POST', '/api/cadastro/convite/' + convA, { body: dados({ aceite: false }) })).s, 400);
  });
  await teste('cadastro A funciona e já entra (teste 20 dias)', async () => {
    const r = await api('POST', '/api/cadastro/convite/' + convA, { body: dados() });
    assert.equal(r.s, 201, JSON.stringify(r.j)); A = r.j.token;
    const me = await api('GET', '/api/auth/me', { tok: A });
    assert.equal(me.j.acesso.tipo, 'teste'); assert(me.j.acesso.diasRestantes >= 19 && me.j.acesso.diasRestantes <= 20);
  });
  await teste('convite já usado não funciona de novo', async () => {
    assert.equal((await api('POST', '/api/cadastro/convite/' + convA, { body: dados({ slug: 'outro-x', email: 'z@x.com', cpf: '' }) })).s, 404);
  });
  await teste('cadastro B funciona', async () => {
    const r = await api('POST', '/api/cadastro/convite/' + convB, { body: dados({ nome: 'Beltrano', criatorio: 'Sitio B', email: 'b@x.com', slug: 'sitio-b', cpf: '' }) });
    assert.equal(r.s, 201, JSON.stringify(r.j)); B = r.j.token;
  });
  await teste('mesmo e-mail / mesmo endereço não duplica', async () => {
    const c = (await api('POST', '/api/dono/convites', { tok: dono, body: {} })).j.link.split('convite=')[1];
    assert.equal((await api('POST', '/api/cadastro/convite/' + c, { body: dados({ slug: 'novo-slug', cpf: '' }) })).s, 409);          // e-mail igual
    assert.equal((await api('POST', '/api/cadastro/convite/' + c, { body: dados({ email: 'n@x.com', cpf: '' }) })).s, 409);           // slug igual
  });
  await teste('login por CPF funciona', async () => {
    const r = await api('POST', '/api/auth/login', { body: { identificador: '52998224725', senha: 'SenhaForte1' } });
    assert.equal(r.s, 200);
  });

  console.log('\n— Isolamento dos dados');
  const novaAve = (nome, anilha) => ({ nome, anilha, sexo: 'M', especie: 'Agapornis', no_site: true, categoria_site: 'adulto' });
  let aveA, aveB;
  await teste('A e B cadastram uma ave cada', async () => {
    const a = await api('POST', '/api/aves', { tok: A, body: novaAve('Thor', 'AAA-1') });
    const b = await api('POST', '/api/aves', { tok: B, body: novaAve('Luna', 'BBB-1') });
    assert.equal(a.s, 201, JSON.stringify(a.j)); assert.equal(b.s, 201, JSON.stringify(b.j)); aveA = a.j.id; aveB = b.j.id;
  });
  await teste('A só vê as aves de A, B só as de B', async () => {
    const a = (await api('GET', '/api/aves', { tok: A })).j, b = (await api('GET', '/api/aves', { tok: B })).j;
    assert.deepEqual(a.map((x) => x.nome), ['Thor']); assert.deepEqual(b.map((x) => x.nome), ['Luna']);
  });
  await teste('A não consegue ler/apagar ave que não é dela; B continua com a sua', async () => {
    assert.equal((await api('GET', '/api/aves/9999', { tok: A })).s, 404);
    assert.equal((await api('DELETE', '/api/aves/9999', { tok: A })).s, 404);
    assert.equal((await api('GET', '/api/aves', { tok: B })).j.length, 1);
    assert.equal((await api('GET', '/api/aves', { tok: A })).j.length, 1);
  });
  await teste('token de A + cabeçalho X-Tenant de B em rota PRIVADA: continua sendo A', async () => {
    const r = await api('GET', '/api/aves', { tok: A, h: { 'X-Tenant': 'sitio-b' } });
    assert.deepEqual(r.j.map((x) => x.nome), ['Thor']);
  });
  await teste('rota privada sem token é 401 (mesmo apontando para um site)', async () => {
    assert.equal((await api('GET', '/api/aves', { h: { 'X-Tenant': 'sitio-b' } })).s, 401);
    assert.equal((await api('GET', '/api/aves?t=sitio-b')).s, 401);
  });
  await teste('token do DONO não abre dados de criatório', async () => {
    assert.equal((await api('GET', '/api/aves', { tok: dono })).s, 403);
    assert.equal((await api('GET', '/api/mensagens', { tok: dono })).s, 403);
  });
  await teste('criador não entra no painel do dono', async () => {
    assert.equal((await api('GET', '/api/dono/clientes', { tok: A })).s, 403);
  });
  await teste('token adulterado é recusado', async () => {
    assert.equal((await api('GET', '/api/aves', { tok: A.slice(0, -3) + 'abc' })).s, 401);
  });

  console.log('\n— Reprodução finalizada');
  await teste('finalizada = Sim vira status Finalizado (mesmo se o formulário mandou "Ativo")', async () => {
    const r = await api('POST', '/api/reproducoes', { tok: A, body: { status: 'Ativo', finalizada: 'Sim', femeaNome: 'F1', femeaAnilha: 'X1', filhotes: [{ nome: 'Pipi', sexo: 'Indefinido', anilha: '' }] } });
    assert.equal(r.s, 201); assert.equal(r.j.status, 'Finalizado');
    const lista = (await api('GET', '/api/reproducoes', { tok: A })).j;
    assert.equal(lista[0].status, 'Finalizado');
    const ativa = await api('POST', '/api/reproducoes', { tok: A, body: { status: 'Ativo', finalizada: 'Não', femeaNome: 'F2', femeaAnilha: 'X2' } });
    assert.equal(ativa.j.status, 'Ativo');
    const upd = await api('PUT', '/api/reproducoes/' + ativa.j.id, { tok: A, body: { finalizada: 'Sim' } });
    assert.equal(upd.j.status, 'Finalizado');
  });
  await teste('reprodução de A não aparece para B', async () => {
    assert.equal((await api('GET', '/api/reproducoes', { tok: B })).j.length, 0);
  });

  console.log('\n— Limites do plano');
  await teste('/api/conta informa os limites (3 fotos/ave, galeria 50, banners 5)', async () => {
    const c = (await api('GET', '/api/conta', { tok: B })).j.limites;
    assert.equal(c.fotosAve, 3); assert.equal(c.galeria, 50); assert.equal(c.banners, 5);
  });
  const foto = 'data:image/jpeg;base64,' + 'A'.repeat(200);
  await teste('ave aceita até 3 fotos; a 4ª é recusada com mensagem', async () => {
    const ok = await api('POST', '/api/aves', { tok: B, body: { nome: 'Tres', anilha: 'B-3F', sexo: 'M', especie: 'x', fotos: [foto, foto, foto] } });
    assert.equal(ok.s, 201, JSON.stringify(ok.j));
    const ruim = await api('POST', '/api/aves', { tok: B, body: { nome: 'Quatro', anilha: 'B-4F', sexo: 'M', especie: 'x', fotos: [foto, foto, foto, foto] } });
    assert.equal(ruim.s, 400); assert(/3 fotos/.test(ruim.j.error));
    const put = await api('PUT', '/api/aves/' + ok.j.id, { tok: B, body: { fotos: [foto, foto, foto, foto] } });
    assert.equal(put.s, 400);
  });
  await teste('galeria: 50 fotos passam, a 51ª não', async () => {
    const f = (n) => Array.from({ length: n }, (_, i) => ({ url: foto, titulo: 'f' + i, categoria: 'Criação' }));
    assert.equal((await api('PUT', '/api/config/site_fotos', { tok: B, body: { valor: f(50) } })).s, 200);
    const r = await api('PUT', '/api/config/site_fotos', { tok: B, body: { valor: f(51) } });
    assert.equal(r.s, 400); assert(/50 fotos/.test(r.j.error));
    assert.equal((await api('PUT', '/api/config/site_fotos', { tok: B, body: { valor: f(10) } })).s, 200);   // remover sempre pode
  });
  await teste('banners: no máximo 5', async () => {
    const b = (n) => Array.from({ length: n }, () => ({ tamanho: 'medio', imagemUrl: foto, link: '' }));
    assert.equal((await api('PUT', '/api/config/site_banners', { tok: B, body: { valor: b(5) } })).s, 200);
    assert.equal((await api('PUT', '/api/config/site_banners', { tok: B, body: { valor: b(6) } })).s, 400);
  });
  await teste('imagem nova gigante na galeria é recusada', async () => {
    const enorme = { url: 'data:image/jpeg;base64,' + 'A'.repeat(3000000), titulo: 'x', categoria: 'Criação' };
    const r = await api('PUT', '/api/config/site_fotos', { tok: B, body: { valor: [...Array.from({ length: 10 }, () => ({ url: foto, titulo: 'f', categoria: 'Criação' })), enorme] } });
    assert.equal(r.s, 400); assert(/grande demais/.test(r.j.error));
  });
  await teste('conta antiga com mais fotos que o limite não perde nada ao editar', async () => {
    await api('PUT', '/api/dono/planos/teste', { tok: dono, body: { limite_fotos_ave: 6 } });
    const ave = await api('POST', '/api/aves', { tok: B, body: { nome: 'Seis', anilha: 'B-6F', sexo: 'F', especie: 'x', fotos: Array(6).fill(foto) } });
    assert.equal(ave.s, 201, JSON.stringify(ave.j));
    await api('PUT', '/api/dono/planos/teste', { tok: dono, body: { limite_fotos_ave: 3 } });
    const upd = await api('PUT', '/api/aves/' + ave.j.id, { tok: B, body: { nome: 'Seis editada', fotos: Array(6).fill(foto) } });
    assert.equal(upd.s, 200, JSON.stringify(upd.j));
    assert.equal(JSON.parse(JSON.stringify(upd.j.fotos)).length, 6);
  });

  console.log('\n— Proteção contra scripts');
  const sujo = '<img src=x onerror=alert(1)>Zeca" onmouseover="x\\`';
  await teste('o sanitizador neutraliza tags, aspas e links perigosos', async () => {
    const { limparProfundo } = require('../lib/sanitizar');
    const r = limparProfundo({ a: sujo, b: ['<script>x</script>'], link: 'javascript:alert(1)', ok: 'https://exemplo.com/a?b=1', img: 'data:image/png;base64,iVBORw0KGgo=', ruim: 'data:text/html;base64,PHNjcmlwdD4=', n: 5, t: true });
    const txt = JSON.stringify(r);
    assert(!/[<>\\`]/.test(r.a) && !r.a.includes('"') && !/[<>]/.test(r.b[0]));
    assert.equal(r.link, ''); assert.equal(r.ruim, ''); assert.equal(r.ok, 'https://exemplo.com/a?b=1');
    assert(r.img.startsWith('data:image/png')); assert.equal(r.n, 5); assert.equal(r.t, true); assert(txt.length > 10);
  });
  await teste('nome de ave com código é guardado sem código', async () => {
    const r = await api('POST', '/api/aves', { tok: B, body: { nome: sujo, anilha: 'XSS-1', sexo: 'M', especie: '<b>x</b>', pai: '"><script>a</script>', video_url: 'https://youtu.be/abc' } });
    assert.equal(r.s, 201, JSON.stringify(r.j));
    const g = (await api('GET', '/api/aves/' + r.j.id, { tok: B })).j;
    for (const c of ['nome', 'especie', 'pai']) assert(!/[<>]/.test(g[c] || ''), c + ' ainda tem < ou >: ' + g[c]);
    assert(!String(g.nome).includes('"') && !String(g.nome).includes('`'));
  });
  await teste('configuração do site e mensagens de visitante também são limpas', async () => {
    await api('PUT', '/api/config/site_personalizacao', { tok: B, body: { valor: { nome: '<script>alert(1)</script>Sitio', logoUrl: 'javascript:alert(1)', subtitulo: 'a"b' } } });
    const c = (await api('GET', '/api/config/publico/site_personalizacao', { h: { 'X-Tenant': 'sitio-b' } })).j;
    assert(!/[<>]/.test(c.nome)); assert.equal(c.logoUrl, ''); assert(!c.subtitulo.includes('"'));
    const m = await api('POST', '/api/mensagens', { h: { 'X-Tenant': 'sitio-b' }, body: { tipo: 'contato', nome: 'Visi<img onerror=1>', contato: '11999999999', mensagem: '<script>1</script>oi' } });
    assert.equal(m.s, 201);
    const lista = (await api('GET', '/api/mensagens', { tok: B })).j;
    assert(lista.every((x) => !/[<>]/.test(x.nome + x.mensagem)));
  });
  await teste('banner com link javascript: é descartado', async () => {
    await api('PUT', '/api/config/site_banners', { tok: B, body: { valor: [{ tamanho: 'medio', imagemUrl: 'data:image/png;base64,iVBORw0KGgo=', link: 'javascript:alert(1)' }] } });
    const b = (await api('GET', '/api/config/publico/site_banners', { h: { 'X-Tenant': 'sitio-b' } })).j;
    assert.equal(b[0].link, '');
  });
  await teste('cabeçalhos de segurança presentes', async () => {
    const r = await api('GET', '/api/aves/publico/site', { h: { 'X-Tenant': 'sitio-b' } });
    const rr = await new Promise((res) => require('http').get({ host: '127.0.0.1', port: srv.address().port, path: '/login.html' }, (x) => res(x.headers)));
    assert.equal(rr['x-content-type-options'], 'nosniff'); assert.equal(rr['x-frame-options'], 'SAMEORIGIN'); assert(r);
  });

  console.log('\n— Privacidade do site e plano "só site"');
  await teste('leitura PÚBLICA do cadastro do criatório não traz CPF nem endereço', async () => {
    await api('PUT', '/api/config/dados_criatorio', { tok: B, body: { valor: { nomeCriatorio: 'Sitio B', cpf: '111.222.333-44', endereco: 'Rua Secreta', cep: '01000-000', registro: 'REG-1', celular: '(11) 99999-9999', cidade: 'SP' } } });
    const pub = (await api('GET', '/api/config/publico/dados_criatorio', { h: { 'X-Tenant': 'sitio-b' } })).j;
    assert.equal(pub.registro, 'REG-1'); assert.equal(pub.celular, '(11) 99999-9999');
    for (const k of ['cpf', 'endereco', 'cep']) assert.equal(pub[k], undefined, k + ' vazou');
    const priv = (await api('GET', '/api/config/dados_criatorio', { tok: B })).j;
    assert.equal(priv.cpf, '111.222.333-44');                    // o dono vê tudo
  });
  await teste('leitura completa exige login e só traz o banco do token', async () => {
    assert.equal((await api('GET', '/api/config/dados_criatorio', { h: { 'X-Tenant': 'sitio-b' } })).s, 401);
    const deA = (await api('GET', '/api/config/dados_criatorio', { tok: A })).j;
    assert(!deA || deA.cpf !== '111.222.333-44');
  });
  await teste('plano "só site": sem Reprodução no servidor, site com proteção de imagens, sem impressão', async () => {
    const id = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((c) => c.slug === 'sitio-b').id;
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { plano_id: 'so_site', status: 'ativo', plano_fim: new Date(Date.now() + 864e5 * 300).toISOString() } });
    assert.equal((await api('GET', '/api/reproducoes', { tok: B })).s, 403);
    assert.equal((await api('GET', '/api/aves', { tok: B })).s, 200);                        // cadastro de aves continua
    const me = (await api('GET', '/api/auth/me', { tok: B })).j;
    assert.equal(me.plano.imprimir, false); assert.equal(me.plano.gerenciador, 'reduzido');
    const pers = (await api('GET', '/api/config/publico/site_personalizacao', { h: { 'X-Tenant': 'sitio-b' } })).j;
    assert.equal(pers.protegerImagens, true);
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { plano_id: 'completo' } });
    assert.equal((await api('GET', '/api/reproducoes', { tok: B })).s, 200);
    const pers2 = (await api('GET', '/api/config/publico/site_personalizacao', { h: { 'X-Tenant': 'sitio-b' } })).j;
    assert.equal(pers2.protegerImagens, undefined);
  });
  await teste('plano "só gerenciador" não edita o site', async () => {
    const id = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((c) => c.slug === 'sitio-b').id;
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { plano_id: 'so_gerenciador' } });
    const r = await api('PUT', '/api/config/site_conteudo', { tok: B, body: { valor: { whatsapp: '1' } } });
    assert.equal(r.s, 403); assert.equal(r.j.codigo, 'FORA_DO_PLANO');
    assert.equal((await api('PUT', '/api/config/dados_criatorio', { tok: B, body: { valor: { nomeCriatorio: 'x' } } })).s, 200);   // cadastro continua
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { plano_id: 'completo' } });
  });

  console.log('\n— Site público por criatório');
  await teste('X-Tenant escolhe o site certo', async () => {
    const a = (await api('GET', '/api/aves/publico/site', { h: { 'X-Tenant': 'fazenda-a' } })).j;
    const b = (await api('GET', '/api/aves/publico/site', { h: { 'X-Tenant': 'sitio-b' } })).j;
    assert.deepEqual(a.map((x) => x.nome), ['Thor']); assert.deepEqual(b.map((x) => x.nome), ['Luna']);
  });
  await teste('subdomínio escolhe o site certo (Host)', async () => {
    const b = (await api('GET', '/api/aves/publico/site', { h: { Host: 'sitio-b.teste.local' } })).j;
    assert.deepEqual(b.map((x) => x.nome), ['Luna']);
  });
  await teste('Referer /c/NOME/ escolhe o site (para <img>)', async () => {
    const b = (await api('GET', '/api/aves/publico/site', { h: { Referer: 'http://x/c/sitio-b/site-plantel.html' } })).j;
    assert.deepEqual(b.map((x) => x.nome), ['Luna']);
  });
  await teste('sem saber o site: 404 (não vaza nada)', async () => {
    assert.equal((await api('GET', '/api/aves/publico/site')).s, 404);
    assert.equal((await api('GET', '/api/aves/publico/site', { h: { 'X-Tenant': 'nao-existe' } })).s, 404);
  });
  await teste('com token de A abrindo o site de B vê o PÚBLICO de B (nunca o privado)', async () => {
    const r = await api('GET', '/api/aves/publico/site', { tok: A, h: { 'X-Tenant': 'sitio-b' } });
    assert.deepEqual(r.j.map((x) => x.nome), ['Luna']);
  });
  await teste('config pública e mensagens vão para o criatório certo', async () => {
    await api('PUT', '/api/config/site_personalizacao', { tok: A, body: { valor: { nome: 'Fazenda A' } } });
    await api('PUT', '/api/config/site_personalizacao', { tok: B, body: { valor: { nome: 'Sitio B' } } });
    assert.equal((await api('GET', '/api/config/publico/site_personalizacao', { h: { 'X-Tenant': 'fazenda-a' } })).j.nome, 'Fazenda A');
    assert.equal((await api('GET', '/api/config/publico/site_personalizacao', { h: { 'X-Tenant': 'sitio-b' } })).j.nome, 'Sitio B');
    const m = await api('POST', '/api/mensagens', { h: { 'X-Tenant': 'sitio-b' }, body: { tipo: 'contato', nome: 'Visitante', contato: '11999999999', mensagem: 'oi' } });
    assert.equal(m.s, 201, JSON.stringify(m.j));
    assert.equal((await api('GET', '/api/mensagens', { tok: A })).j.length, 0);
    assert((await api('GET', '/api/mensagens', { tok: B })).j.length >= 1);
  });
  await teste('páginas por caminho /c/NOME e por subdomínio', async () => {
    assert.equal((await api('GET', '/c/fazenda-a/site-home.html')).s, 200);
    assert.equal((await api('GET', '/c/nao-existe/site-home.html')).s, 404);
    const raiz = await api('GET', '/', { h: { Host: 'fazenda-a.teste.local' } });
    assert.equal(raiz.s, 200); assert(/site-buttons|style-site/.test(raiz.t), 'a raiz do subdomínio deve ser o site');
    const app = await api('GET', '/', { h: { Host: 'app.teste.local' } });
    assert.equal(app.s, 200); assert(/login-email/.test(app.t), 'o endereço do app deve mostrar o login');
  });

  console.log('\n— Plano, teste e bloqueio');
  const idDe = async (slug) => (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((c) => c.slug === slug).id;
  await teste('teste acabou: A é bloqueado (402) mas vê a tela de planos; o site sai do ar; B segue normal', async () => {
    const id = await idDe('fazenda-a');
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { trial_fim: new Date(Date.now() - 86400000).toISOString() } });
    assert.equal((await api('GET', '/api/aves', { tok: A })).s, 402);
    assert.equal((await api('POST', '/api/aves', { tok: A, body: novaAve('X', 'X1') })).s, 402);
    const c = await api('GET', '/api/conta', { tok: A }); assert.equal(c.s, 200); assert.equal(c.j.acesso.ativo, false);
    assert.equal((await api('GET', '/api/aves/publico/site', { h: { 'X-Tenant': 'fazenda-a' } })).s, 503);
    assert.equal((await api('GET', '/api/aves', { tok: B })).s, 200);
  });
  await teste('prorrogar o teste libera de novo', async () => {
    await api('POST', '/api/dono/clientes/' + (await idDe('fazenda-a')) + '/prorrogar', { tok: dono, body: { dias: 5 } });
    assert.equal((await api('GET', '/api/aves', { tok: A })).s, 200);
  });
  await teste('carência após vencer a anuidade: pode ler, não pode gravar', async () => {
    await api('PUT', '/api/dono/clientes/' + (await idDe('fazenda-a')), { tok: dono, body: { status: 'ativo', plano_id: 'completo', plano_fim: new Date(Date.now() - 2 * 86400000).toISOString() } });
    assert.equal((await api('GET', '/api/aves', { tok: A })).s, 200);
    assert.equal((await api('POST', '/api/aves', { tok: A, body: novaAve('Y', 'Y1') })).s, 402);
  });
  await teste('passou da carência: bloqueado de vez', async () => {
    await api('PUT', '/api/dono/clientes/' + (await idDe('fazenda-a')), { tok: dono, body: { plano_fim: new Date(Date.now() - 10 * 86400000).toISOString() } });
    assert.equal((await api('GET', '/api/aves', { tok: A })).s, 402);
  });
  await teste('plano "só gerenciador": o site público não existe', async () => {
    const id = await idDe('fazenda-a');
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { status: 'ativo', plano_id: 'so_gerenciador', plano_fim: new Date(Date.now() + 86400000 * 300).toISOString() } });
    assert.equal((await api('GET', '/api/aves', { tok: A })).s, 200);
    assert.equal((await api('GET', '/api/aves/publico/site', { h: { 'X-Tenant': 'fazenda-a' } })).s, 404);
  });
  await teste('suspenso pelo dono: bloqueado', async () => {
    await api('PUT', '/api/dono/clientes/' + (await idDe('sitio-b')), { tok: dono, body: { status: 'suspenso' } });
    assert.equal((await api('GET', '/api/aves', { tok: B })).s, 402);
    await api('PUT', '/api/dono/clientes/' + (await idDe('sitio-b')), { tok: dono, body: { status: 'teste', trial_fim: new Date(Date.now() + 86400000 * 10).toISOString() } });
    assert.equal((await api('GET', '/api/aves', { tok: B })).s, 200);
  });
  await teste('domínio próprio só vale depois de ativado pelo dono', async () => {
    const id = await idDe('sitio-b');
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { dominio_proprio: 'sitiob.com.br' } });
    assert.equal((await api('GET', '/api/aves/publico/site', { h: { Host: 'sitiob.com.br' } })).s, 404);
    await api('PUT', '/api/dono/clientes/' + id, { tok: dono, body: { dominio_ativo: true } });
    assert.deepEqual((await api('GET', '/api/aves/publico/site', { h: { Host: 'sitiob.com.br' } })).j.map((x) => x.nome), ['Luna']);
    assert.equal((await api('PUT', '/api/dono/clientes/' + (await idDe('fazenda-a')), { tok: dono, body: { dominio_proprio: 'sitiob.com.br' } })).s, 409);
  });

  console.log('\n— Privacidade do dono');
  await teste('dono vê só números de uso, e a ação fica na auditoria', async () => {
    const u = await api('GET', '/api/dono/clientes/' + (await idDe('sitio-b')) + '/uso', { tok: dono });
    assert.equal(u.s, 200); assert(u.j.aves >= 1); assert(!JSON.stringify(u.j).includes('Luna'));
    const aud = (await api('GET', '/api/dono/auditoria', { tok: dono })).j;
    assert(aud.some((x) => x.acao === 'ver_uso'));
  });
  await teste('convite só guarda o hash do link', async () => {
    const { rows } = await master.query('SELECT token_hash FROM convites LIMIT 1');
    assert(!JSON.stringify(rows).includes(convA));
  });
  await teste('endereço do banco do cliente fica cifrado no mestre', async () => {
    const { rows } = await master.query('SELECT db_url_enc FROM tenants LIMIT 1');
    assert(rows[0].db_url_enc.startsWith('v1:') && !rows[0].db_url_enc.includes('postgres'));
  });

  console.log('\n— CIG e sexagem opcionais');
  await teste('CIG/laudo só aparecem no site quando o criador marca "mostrar"', async () => {
    const pdf = 'data:application/pdf;base64,JVBERi0xLjQK';
    const r = await api('POST', '/api/aves', { tok: B, body: { nome: 'ComCig', anilha: 'CIG-1', sexo: 'M', especie: 'x', no_site: true, categoria_site: 'adulto', cig_numero: 'CIG123', cig_arquivo: pdf, sexagem_arquivo: pdf } });
    assert.equal(r.s, 201, JSON.stringify(r.j));
    const h = { 'X-Tenant': 'sitio-b' };
    const lista = async () => (await api('GET', '/api/aves/publico/site', { h })).j.find((x) => x.nome === 'ComCig');
    let a = await lista();
    assert.equal(a.temCig, false); assert.equal(a.temSexagem, false); assert(!a.cigNumero);
    assert.equal((await api('GET', `/api/aves/publico/arquivo/${r.j.id}/cig`, { h })).s, 404);
    assert.equal((await api('GET', `/api/aves/publico/arquivo/${r.j.id}/sexagem`, { h })).s, 404);
    const m = (await api('GET', `/api/aves/publico/midia/${r.j.id}`, { h })).j;
    assert(!m.cigNumero && !m.cigTipo && !m.sexagemTipo);
    await api('PUT', '/api/aves/' + r.j.id, { tok: B, body: { mostrar_cig: true } });
    a = await lista();
    assert.equal(a.temCig, true); assert.equal(a.cigNumero, 'CIG123'); assert.equal(a.temSexagem, false);
    assert.equal((await api('GET', `/api/aves/publico/arquivo/${r.j.id}/cig`, { h })).s, 200);
    assert.equal((await api('GET', `/api/aves/publico/arquivo/${r.j.id}/sexagem`, { h })).s, 404);
    await api('PUT', '/api/aves/' + r.j.id, { tok: B, body: { mostrar_sexagem: true } });
    assert.equal((await lista()).temSexagem, true);
  });


  console.log('\n— Backup, restauração e importação');
  const emailsDe = async (para) => (await master.query('SELECT corpo, assunto FROM emails_log WHERE para = $1 ORDER BY id DESC', [para])).rows;
  const tokenDe = async (para, assunto) => { const e = (await emailsDe(para)).find((x) => x.assunto.includes(assunto)); return e && /token=([A-Za-z0-9_-]+)/.exec(e.corpo)[1]; };
  let C, D, cliC, cliD;
  const novoCliente = async (slug, email) => {
    const c = (await api('POST', '/api/dono/convites', { tok: dono, body: { plano_id: 'teste' } })).j.link.split('convite=')[1];
    const r = await api('POST', '/api/cadastro/convite/' + c, { body: { nome: 'Fulano ' + slug, criatorio: 'Criatorio ' + slug, email, slug, senha: 'SenhaForte1', aceite: true } });
    assert.equal(r.s, 201, JSON.stringify(r.j)); return r.j.token;
  };
  const fotoB = 'data:image/jpeg;base64,' + 'B'.repeat(300);
  await teste('cria clientes C e D e popula o C', async () => {
    C = await novoCliente('fazenda-c', 'c@x.com'); D = await novoCliente('fazenda-d', 'd@x.com');
    for (const [n, an] of [['Alfa', 'C-1'], ['Beta', 'C-2']]) {
      assert.equal((await api('POST', '/api/aves', { tok: C, body: { nome: n, anilha: an, sexo: 'M', especie: 'Agapornis', fotos: [fotoB, fotoB], no_site: true, mostrar_cig: true } })).s, 201);
    }
    assert.equal((await api('POST', '/api/reproducoes', { tok: C, body: { status: 'Ativo', femeaNome: 'Beta' } })).s, 201);
    assert.equal((await api('PUT', '/api/config/site_conteudo', { tok: C, body: { valor: { whatsapp: '21988887777' } } })).s, 200);
    cliC = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((c) => c.slug === 'fazenda-c');
    cliD = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((c) => c.slug === 'fazenda-d');
  });
  let arquivo;
  await teste('exportar traz tudo (inclusive fotos) em um arquivo válido', async () => {
    const r = await api('GET', '/api/backup/exportar', { tok: C });
    assert.equal(r.s, 200); arquivo = JSON.parse(r.t);
    assert.equal(arquivo.formato, 'aviari-criatorio'); assert.equal(arquivo.criatorio.slug, 'fazenda-c');
    assert.equal(arquivo.tabelas.aves.length, 2); assert.equal(arquivo.tabelas.aves[0].fotos.length, 2);
    assert.equal(arquivo.tabelas.reproducoes.length, 1);
    assert(arquivo.tabelas.site_config.some((c) => c.chave === 'site_conteudo'));
    assert(!JSON.stringify(arquivo).includes('senha'));                    // nenhuma senha no arquivo
  });
  await teste('exportar exige login e é do próprio criatório', async () => {
    assert.equal((await api('GET', '/api/backup/exportar')).s, 401);
    assert.equal((await api('GET', '/api/backup/exportar', { tok: dono })).s, 403);
    const dEx = JSON.parse((await api('GET', '/api/backup/exportar', { tok: D })).t);
    assert.equal(dEx.tabelas.aves.length, 0);
  });
  await teste('restaurar exige confirmação e lote sem abrir restauração é recusado', async () => {
    assert.equal((await api('POST', '/api/backup/iniciar', { tok: D, body: {} })).s, 400);
    assert.equal((await api('POST', '/api/backup/lote', { tok: D, body: { tabela: 'aves', linhas: [{ nome: 'x' }] } })).s, 409);
    assert.equal((await api('POST', '/api/backup/lote', { tok: D, body: { tabela: 'usuarios', linhas: [{ nome: 'x' }] } })).s, 400);
  });
  await teste('restaurar o arquivo do C dentro do D: dados idênticos, sem misturar com o C', async () => {
    assert.equal((await api('POST', '/api/backup/iniciar', { tok: D, body: { confirmacao: 'SUBSTITUIR' } })).s, 200);
    for (const [tabela, linhas] of Object.entries(arquivo.tabelas)) {
      if (!linhas.length) continue;
      const r = await api('POST', '/api/backup/lote', { tok: D, body: { tabela, linhas } });
      assert.equal(r.s, 200, tabela + ': ' + JSON.stringify(r.j));
    }
    assert.equal((await api('POST', '/api/backup/finalizar', { tok: D })).s, 200);
    const aves = (await api('GET', '/api/aves', { tok: D })).j;
    assert.deepEqual(aves.map((a) => a.nome).sort(), ['Alfa', 'Beta']);
    const ficha = (await api('GET', '/api/aves/' + aves[0].id, { tok: D })).j;
    assert.equal(ficha.fotos.length, 2);
    assert.equal((await api('GET', '/api/reproducoes', { tok: D })).j.length, 1);
    assert.equal((await api('GET', '/api/config/site_conteudo', { tok: D })).j.whatsapp, '21988887777');
    const nova = await api('POST', '/api/aves', { tok: D, body: { nome: 'Gama', anilha: 'D-9', sexo: 'F', especie: 'x' } });
    assert.equal(nova.s, 201); assert(nova.j.id > Math.max(...aves.map((a) => a.id)));   // contador acertado
    assert.equal((await api('GET', '/api/aves', { tok: C })).j.length, 2);                // C continua só com as dele
  });
  await teste('linha maliciosa no arquivo de backup é limpa ao restaurar', async () => {
    await api('POST', '/api/backup/iniciar', { tok: D, body: { confirmacao: 'SUBSTITUIR' } });
    const l = { ...arquivo.tabelas.aves[0], nome: '<img src=x onerror=alert(1)>Zeta', usuario_id: 999 };
    assert.equal((await api('POST', '/api/backup/lote', { tok: D, body: { tabela: 'aves', linhas: [l] } })).s, 200);
    await api('POST', '/api/backup/finalizar', { tok: D });
    const aves = (await api('GET', '/api/aves', { tok: D })).j;
    assert.equal(aves.length, 1); assert(!/[<>]/.test(aves[0].nome)); assert.equal(aves[0].usuario_id, 1);
    assert.equal((await api('POST', '/api/backup/lote', { tok: D, body: { tabela: 'usuarios', linhas: [{}] } })).s, 400);   // só tabelas permitidas
  });

  console.log('\n— Importação de planilha e limite de aves');
  await teste('cadastro em lote: entram as boas, voltam as ruins com o motivo', async () => {
    const r = await api('POST', '/api/aves/lote', { tok: C, body: { aves: [
      { nome: 'P1', anilha: 'P-1', sexo: 'M', especie: 'Calopsita' }, { nome: 'P2', anilha: 'P-2', sexo: 'F', especie: 'Calopsita' },
      { nome: 'Sem anilha', anilha: '', sexo: 'M' }, { nome: '', anilha: 'P-9' }, { nome: 'Repetida', anilha: 'C-1' }, { nome: 'P1b', anilha: 'p-1' }] } });
    assert.equal(r.s, 201, JSON.stringify(r.j)); assert.equal(r.j.criadas, 2);
    const motivos = r.j.ignoradas.map((x) => x.motivo).sort();
    assert.deepEqual(motivos, ['anilha já cadastrada', 'anilha já cadastrada', 'sem anilha', 'sem nome']);
  });
  await teste('limite de aves do plano vale no cadastro normal e em lote', async () => {
    const total = (await api('GET', '/api/aves', { tok: C })).j.length;
    await api('PUT', '/api/dono/planos/teste', { tok: dono, body: { limite_aves: total + 1 } });
    const lote = await api('POST', '/api/aves/lote', { tok: C, body: { aves: [{ nome: 'L1', anilha: 'L-1' }, { nome: 'L2', anilha: 'L-2' }] } });
    assert.equal(lote.j.criadas, 1); assert(/limite/.test(lote.j.ignoradas[0].motivo));
    const um = await api('POST', '/api/aves', { tok: C, body: { nome: 'L3', anilha: 'L-3', sexo: 'M', especie: 'x' } });
    assert.equal(um.s, 403); assert.equal(um.j.codigo, 'LIMITE_AVES');
    await api('PUT', '/api/dono/planos/teste', { tok: dono, body: { limite_aves: null } });
    assert.equal((await api('POST', '/api/aves', { tok: C, body: { nome: 'L3', anilha: 'L-3', sexo: 'M', especie: 'x' } })).s, 201);
  });

  console.log('\n— E-mail: confirmar cadastro e recuperar senha');
  await teste('cadastro manda e-mail de confirmação; o link confirma uma vez só', async () => {
    const t = await tokenDe('c@x.com', 'Confirme');
    assert(t, 'sem e-mail de confirmação');
    assert.equal((await api('GET', '/api/auth/me', { tok: C })).j.emailConfirmado, false);
    assert.equal((await api('POST', '/api/auth/confirmar-email', { body: { token: t } })).s, 200);
    assert.equal((await api('GET', '/api/auth/me', { tok: C })).j.emailConfirmado, true);
    assert.equal((await api('POST', '/api/auth/confirmar-email', { body: { token: t } })).s, 400);
  });
  await teste('esqueci a senha: resposta igual com ou sem conta (não revela quem existe)', async () => {
    const a = await api('POST', '/api/auth/esqueci', { body: { identificador: 'c@x.com' } });
    const b = await api('POST', '/api/auth/esqueci', { body: { identificador: 'ninguem@x.com' } });
    assert.equal(a.s, 200); assert.equal(b.s, 200); assert.equal(a.j.mensagem, b.j.mensagem);
    assert.equal((await emailsDe('ninguem@x.com')).length, 0);
    assert(await tokenDe('c@x.com', 'Redefinir'));
  });
  await teste('redefinir: senha curta recusada, link funciona UMA vez, senha antiga deixa de valer', async () => {
    const t = await tokenDe('c@x.com', 'Redefinir');
    assert.equal((await api('POST', '/api/auth/redefinir', { body: { token: t, senha: 'curta' } })).s, 400);
    assert.equal((await api('POST', '/api/auth/redefinir', { body: { token: t, senha: 'NovaSenha123' } })).s, 200);
    assert.equal((await api('POST', '/api/auth/redefinir', { body: { token: t, senha: 'OutraSenha123' } })).s, 400);
    assert.equal((await api('POST', '/api/auth/login', { body: { identificador: 'c@x.com', senha: 'SenhaForte1' } })).s, 401);
    assert.equal((await api('POST', '/api/auth/login', { body: { identificador: 'c@x.com', senha: 'NovaSenha123' } })).s, 200);
    assert.equal((await api('POST', '/api/auth/redefinir', { body: { token: 'x'.repeat(40), senha: 'NovaSenha123' } })).s, 400);
  });
  await teste('o dono gera link de redefinição (sem e-mail configurado) e isso fica registrado', async () => {
    const r = await api('POST', `/api/dono/clientes/${cliD.id}/link-redefinicao`, { tok: dono });
    assert.equal(r.s, 201); assert(/redefinir\.html\?token=/.test(r.j.link));
    const t = r.j.link.split('token=')[1];
    assert.equal((await api('POST', '/api/auth/redefinir', { body: { token: t, senha: 'SenhaDoD1234' } })).s, 200);
    assert((await api('GET', '/api/dono/auditoria', { tok: dono })).j.some((x) => x.acao === 'link_redefinicao_gerado'));
    assert.equal((await api('GET', '/api/dono/emails', { tok: dono })).s, 200);
  });

  console.log('\n— Pagamentos, avisos e domínio');
  const fimDe = async (id) => new Date((await api('GET', '/api/dono/clientes', { tok: dono })).j.find((c) => c.id === id).plano_fim);
  await teste('pagamento registrado ativa o plano; o seguinte soma a partir do vencimento', async () => {
    const r = await api('POST', `/api/dono/clientes/${cliC.id}/pagamento`, { tok: dono, body: { plano_id: 'completo', meses: 12, valor_centavos: 29900 } });
    assert.equal(r.s, 201, JSON.stringify(r.j));
    const c = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((x) => x.id === cliC.id);
    assert.equal(c.status, 'ativo'); assert.equal(c.plano_id, 'completo');
    const d1 = (await fimDe(cliC.id) - Date.now()) / 864e5; assert(d1 > 360 && d1 < 368, 'dias: ' + d1);
    await api('POST', `/api/dono/clientes/${cliC.id}/pagamento`, { tok: dono, body: { plano_id: 'completo', meses: 12 } });
    const d2 = (await fimDe(cliC.id) - Date.now()) / 864e5; assert(d2 > 725 && d2 < 735, 'dias: ' + d2);
    assert.equal((await api('POST', `/api/dono/clientes/${cliC.id}/pagamento`, { tok: dono, body: { plano_id: 'teste' } })).s, 400);
    assert(await emailsDe('c@x.com').then((e) => e.some((x) => x.assunto.includes('Pagamento recebido'))));
  });
  await teste('webhook do Asaas: exige token, é idempotente e ignora o que não é pagamento', async () => {
    const corpo = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123', value: 299, externalReference: `aviari:${cliD.id}:completo:12` } };
    assert.equal((await api('POST', '/api/webhooks/asaas', { body: corpo })).s, 401);
    assert.equal((await api('POST', '/api/webhooks/asaas', { body: corpo, h: { 'asaas-access-token': 'errado' } })).s, 401);
    const h = { 'asaas-access-token': 'segredo-do-webhook-de-teste' };
    const r1 = await api('POST', '/api/webhooks/asaas', { body: corpo, h }); assert.equal(r1.s, 200); assert.equal(r1.j.duplicado, false);
    const r2 = await api('POST', '/api/webhooks/asaas', { body: corpo, h }); assert.equal(r2.j.duplicado, true);          // reenvio não soma de novo
    assert.equal((await api('POST', '/api/webhooks/asaas', { body: { event: 'PAYMENT_CREATED', payment: corpo.payment }, h })).j.ignorado, true);
    assert.equal((await api('POST', '/api/webhooks/asaas', { body: { event: 'PAYMENT_RECEIVED', payment: { id: 'p2', externalReference: 'qualquer coisa' } }, h })).j.ignorado, true);
    const d = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((x) => x.id === cliD.id);
    assert.equal(d.status, 'ativo'); assert((await fimDe(cliD.id) - Date.now()) / 864e5 < 368);
    const { rows } = await master.query(`SELECT COUNT(*)::int AS n FROM pagamentos WHERE origem = 'asaas'`); assert.equal(rows[0].n, 1);
  });
  await teste('avisos de vencimento: sai UM e-mail por situação, nunca repetido', async () => {
    const cli = await novoCliente('sitio-e', 'e@x.com');
    const idE = (await api('GET', '/api/dono/clientes', { tok: dono })).j.find((x) => x.slug === 'sitio-e').id;
    await api('PUT', '/api/dono/clientes/' + idE, { tok: dono, body: { trial_fim: new Date(Date.now() + 2 * 864e5 - 3600e3).toISOString() } });
    assert(cli);
    const a = await api('POST', '/api/dono/avisos/executar', { tok: dono }); assert(a.j.enviados >= 1);
    assert((await emailsDe('e@x.com')).some((x) => x.assunto.includes('termina em 2 dias')));
    const b = await api('POST', '/api/dono/avisos/executar', { tok: dono }); assert.equal(b.j.enviados, 0);
    const n = (await emailsDe('e@x.com')).filter((x) => x.assunto.includes('termina em')).length; assert.equal(n, 1);
  });
  await teste('domínio: o Caddy só recebe "pode" para endereços reais e só de dentro do servidor', async () => {
    const pergunta = (d, h = {}) => api('GET', '/api/interno/dominio-permitido?domain=' + encodeURIComponent(d), { h });
    assert.equal((await pergunta('fazenda-c.teste.local')).s, 200);        // subdomínio de cliente
    assert.equal((await pergunta('app.teste.local')).s, 200);
    assert.equal((await pergunta('inexistente.teste.local')).s, 404);
    assert.equal((await pergunta('qualquer-coisa.com.br')).s, 404);
    assert.equal((await pergunta('sitiob.com.br')).s, 200);                // domínio próprio ativado antes
    assert.equal((await pergunta('fazenda-c.teste.local', { 'X-Forwarded-For': '8.8.8.8' })).s, 404);   // vindo de fora (pelo proxy): recusado
  });

  srv.close(); await require('../db/tenants').fecharTudo(); await master.end();
  await drop(); await adm.end();
  console.log(`\n${ok} testes ok, ${falhas.length} falharam.`);
  if (falhas.length) { console.log('Falhas:\n - ' + falhas.join('\n - ')); process.exit(1); }
})().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
