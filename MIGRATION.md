# Guia de migração — localStorage → Postgres

## 0. Antes de tudo: troque a senha do banco
A senha que estava no `_envt` foi exposta neste chat. No painel do seu
provedor (ex: Render → seu banco Postgres → "Rotate password" ou similar),
gere uma senha nova. Só depois disso coloque a `DATABASE_URL` no `.env`.

## 1. Instalar dependências
```bash
cd backend
npm install
```

## 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# edite o .env com a DATABASE_URL nova e um JWT_SECRET aleatório
```

## 3. Criar as tabelas
```bash
psql "$DATABASE_URL" -f db/schema.sql
```
(se não tiver `psql` instalado, dá pra rodar esse SQL por qualquer cliente
gráfico de Postgres, tipo DBeaver ou o próprio painel do Render)

> Se você já rodou o `schema.sql` antes (de uma entrega anterior) e só quer
> atualizar, rode também:
> ```sql
> ALTER TABLE anilhas ADD COLUMN IF NOT EXISTS observacao TEXT;
> ALTER TABLE anilhas ADD COLUMN IF NOT EXISTS data_cadastro DATE;
> ```

## 4. Criar o usuário admin (com senha de verdade, com hash)
```bash
node scripts/create-admin.js "seu@email.com" "UmaSenhaForte123!" "Seu Nome" "Criatório Goularth"
```
Guarde essa senha em um gerenciador de senhas — ela não fica em nenhum
arquivo do projeto, só o hash bcrypt vai para o banco.

## 5. Subir o servidor
```bash
npm start
```
Acesse `http://localhost:3000/login.html`.

## 6. O que já está pronto nesta entrega
- `server.js` — API real (Express + Postgres), sem as rotas manuais de
  arquivo que tinham o path traversal.
- `db/schema.sql` — tabelas `usuarios`, `aves`, `anilhas`, `reproducoes`,
  `site_config`.
- `routes/auth.js` — login com bcrypt + JWT, limite de tentativas por IP.
- `routes/aves.js`, `routes/anilhas.js`, `routes/reproducoes.js` — CRUD
  autenticado, escopado por usuário.
- `routes/config.js` — substitui as antigas chaves `site_personalizacao`,
  `site_noticias` etc. por um key-value guardado no banco (rota pública
  de leitura para o site, rota autenticada para escrita).
- `public/db-api.js` — substitui `db.js`. Mesma "API" (`DB.getAll`,
  `DB.add`...), mas agora assíncrona, batendo na API de verdade.
- `public/auth-client.js` — substitui `auth-check.js`. Confere o token
  de verdade no servidor em vez de uma flag no localStorage.
- `public/login.html` — reescrito para chamar `/api/auth/login`, sem
  credenciais hardcoded no HTML.

## 7. O que ainda falta adaptar (o grosso das páginas do painel)
Todas as páginas administrativas (`dashboard.html`, `passaros.html`,
`cadastro-ave.html`, `anilhas.html`, `arvore.html`, `crachas.html`,
`reproducao.html`, `admin-site.html`, `admin-db.html`,
`site-editor-*.html`, `site-editar.html` etc.) ainda chamam
`DB.getAll(...)` **de forma síncrona**, porque foram escritas para o
`db.js` antigo (localStorage). Com `db-api.js`, toda chamada ao `DB`
devolve uma Promise, então cada função que usa `DB.*` precisa virar
`async` e usar `await`. É uma mudança mecânica, mas precisa ser feita
página por página. Padrão a seguir:

```js
// ANTES (síncrono, localStorage)
function renderizarEstatisticas() {
  const aves = DB.getAll(DB.TABLES.AVES);
  // ...usa aves
}
renderizarEstatisticas();

// DEPOIS (assíncrono, API)
async function renderizarEstatisticas() {
  const aves = await DB.getAll(DB.TABLES.AVES);
  // ...usa aves
}
renderizarEstatisticas();
```

E trocar, no `<head>`/fim do `<body>` de cada página:
```html
<script src="auth-check.js"></script>   →  <script src="auth-client.js"></script>
<script src="db.js"></script>           →  <script src="db-api.js"></script>
```

As páginas `site-*.html` (públicas) também precisam trocar
`localStorage.getItem('site_noticias')` etc. por
`await DB.getConfig('site_noticias')`.

Se quiser, eu sigo migrando as páginas uma a uma a partir daqui — dá pra
fazer o `dashboard.html` e o `admin-db.html` (que já estava quebrado) como
próximos passos.

## 8. Migrar os dados que já existem no localStorage
Se você já tem aves cadastradas no navegador do computador que usa como
admin, abra o console (F12) nessa página antiga e rode:
```js
copy(JSON.stringify({
  aves: JSON.parse(localStorage.getItem('aves') || '[]'),
  anilhas: JSON.parse(localStorage.getItem('anilhas') || '[]')
}))
```
Isso copia os dados pra área de transferência. Me manda esse JSON que eu
escrevo um script de importação para o Postgres.
