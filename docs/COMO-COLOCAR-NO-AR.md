# Aviari — como colocar no ar (teste com amigos: Render grátis + Neon grátis)

Este projeto agora é **multicliente**: cada criatório tem o **próprio banco de dados**.
Há um banco extra, o **mestre**, que guarda só a lista de clientes, logins, planos e convites.

```
 Render (1 serviço Node)
   ├── banco MESTRE  (Neon: projeto "aviari-mestre")
   ├── banco do cliente 1  (Neon: um projeto por cliente, ou Postgres próprio no VPS)
   ├── banco do cliente 2 ...
```

## 1) Antes de tudo (segurança)
- **Troque a senha do banco do Neon** que foi exposta antes (Neon → Dashboard → Roles → Reset password).
- Nunca suba o arquivo `.env` para o GitHub (já está no `.gitignore`).

## 2) Crie os bancos no Neon (grátis)
1. Projeto **aviari-mestre** → copie a *connection string* (use a **direta**, sem "-pooler").
2. Para cada amigo testador: um projeto vazio (ex.: **aviari-joao**) → copie a connection string.
   (No VPS isso não é preciso: o sistema cria o banco sozinho — veja `ADMIN_DATABASE_URL`.)

## 3) Variáveis de ambiente no Render
Em *Environment* do serviço, preencha (modelo em `.env.example`):

| Variável | O que colocar |
|---|---|
| `MASTER_DATABASE_URL` | string do projeto **aviari-mestre** |
| `JWT_SECRET` | texto aleatório longo (veja abaixo como gerar) |
| `APP_KEY` | outro texto aleatório, 32+ caracteres. **Guarde uma cópia**: sem ela os endereços dos bancos e os CPFs não podem ser lidos |
| `APP_URL` | o endereço do seu serviço, ex.: `https://seu-app.onrender.com` |
| `BASE_DOMAIN` | deixe vazio por enquanto (só quando tiver o domínio) |

Gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

*Build command:* `npm install`  ·  *Start command:* `npm start`

## 4) Criar as tabelas e o dono (uma vez só)
No computador (com o `.env` preenchido) ou no *Shell* do Render:
```
npm run init-master
npm run criar-dono -- "seu@email.com" "UmaSenhaForte123" "Seu Nome"
```

## 5) Trazer o SEU criatório atual (Goularth) para dentro do sistema
Seus dados continuam no banco antigo do Neon e o seu login atual continua funcionando:
```
npm run registrar-legado -- goularth "Criatório Goularth" "URL_DO_BANCO_ANTIGO" completo
```
Depois defina `DEFAULT_TENANT_SLUG=goularth` no Render se quiser que o seu site continue
abrindo no endereço principal.

## 6) Convidar os amigos
1. Entre em `https://seu-app.onrender.com/login.html` com o e-mail do **dono** → abre o **Painel do dono**.
2. Aba **Convites** → escolha o plano **Teste grátis** → cole a connection string do projeto Neon
   daquele amigo no campo "Banco já criado" → **Gerar link**.
3. Mande o link. A pessoa preenche nome, e-mail, endereço do site, senha (CPF é opcional) e já entra com **20 dias de teste**.
4. O site dela abre em `https://seu-app.onrender.com/c/endereco-escolhido/`.
5. Sugestões e problemas que ela enviar (botão 💬) aparecem na aba **Sugestões** do seu painel.

## 7) E-mail (confirmar cadastro, recuperar senha, avisos de vencimento)
Escolha UM provedor e preencha no `.env` / no Render:
- **Resend** (resend.com, plano grátis): `RESEND_API_KEY=...` e `EMAIL_FROM=Aviari <nao-responda@seudominio.com.br>`
  (é preciso verificar o domínio lá).
- **SMTP** (Locaweb, Brevo, Gmail com senha de app...): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- **Sem nenhum dos dois** = *modo de teste*: nada é enviado; no **Painel do dono → E-mails** aparece o texto completo (com o link)
  e, em **Clientes → 🔑**, você gera um link de nova senha para mandar por WhatsApp. Serve para o teste com os amigos.

Os avisos ("seu teste termina em 5/2/1 dias", "teste terminou", "plano vence em 15/7/1 dias", "plano venceu") saem sozinhos
a cada 6 horas, **uma vez cada**. Para desligar: `AVISOS_AUTOMATICOS=false` e use `node scripts/avisos.js` no cron.

## 8) Pagamentos
- **Manual (já funciona):** recebeu um Pix/boleto? No Painel do dono → Clientes → **💰 Pagamento**: escolha o plano e os meses.
  O plano é renovado a partir do vencimento atual (quem paga adiantado não perde dias) e o cliente recebe um e-mail.
- **Asaas (automático):** defina `ASAAS_WEBHOOK_TOKEN` no servidor; no Asaas → Integrações → Webhooks, URL
  `https://SEU-ENDERECO/api/webhooks/asaas` com o mesmo token. Ao criar a cobrança, preencha **Referência externa** com
  `aviari:ID_DO_CLIENTE:PLANO:MESES` (ex.: `aviari:12:completo:12`). Pagamento confirmado = plano renovado; o mesmo pagamento
  nunca conta duas vezes. ⚠️ Escrito pela documentação do Asaas, **não testado contra o Asaas real**: faça um pagamento no
  *sandbox* deles antes de confiar.

## 9) Servidor final (VPS Locaweb ou outro) — HTTPS automático, subdomínios e domínio próprio
1. Contrate o VPS (Ubuntu 22.04/24.04), envie o projeto para `/opt/aviari` (`unzip aviari-v2-multicliente.zip -d /opt/aviari`).
2. Como root: `bash /opt/aviari/deploy/instalar-vps.sh seudominio.com.br voce@email.com "SenhaDoDono"`
   (instala Node, Postgres e Caddy, cria o serviço, o firewall e o backup diário).
3. No DNS do seu domínio (deixe "somente DNS", sem proxy): `A app`, `A @` e `A *` apontando para o IP do servidor.
4. Entre em `https://app.seudominio.com.br/login.html` com o e-mail do dono.
- **Subdomínios** (`fulano.seudominio.com.br`): o sistema cria o banco do cliente sozinho no cadastro.
- **Domínio próprio do cliente:** o cliente cria um registro `A` (ou `CNAME`) apontando `www.dominiodele.com.br` para o IP do servidor;
  você ativa em **Clientes → Editar → domínio próprio** e o Caddy emite o certificado na primeira visita.
  O Caddy **só** emite certificado para endereços que o sistema reconhece (`deploy/Caddyfile`).
- ⚠️ O instalador e o Caddyfile foram escritos pelo roteiro padrão dessas ferramentas, mas **nunca rodaram num servidor real**.
  Teste num VPS novo (dá para apagar e refazer) antes de colocar clientes.

## 10) Backups
- **Pelo próprio criador:** menu **Backup & Dados** → baixa um arquivo com TUDO (aves, fotos, documentos, anilhas, reproduções, site,
  mensagens; sem senhas). Também restaura (apaga o que existe e coloca o do arquivo). Funciona mesmo com o plano vencido.
  Serve para mudar um cliente de servidor ou de plano.
- **Pelo servidor:** `deploy/backup.sh` (já agendado pelo instalador, 03:00) guarda 14 dias de cópias de todos os bancos.
  **Isso só vale como backup de verdade se for copiado para FORA do servidor**: configure o `rclone` e `RCLONE_DESTINO`
  (instruções no topo do script).

## Testes automáticos
`npm test` (precisa de um Postgres local; variável `TEST_ADMIN_URL`) — 72 verificações: isolamento entre criatórios, bloqueio do
teste/plano, convites, limites, proteção contra scripts, privacidade, reprodução, CIG opcional, backup e restauração completos,
e-mail e recuperação de senha, pagamentos e webhook, avisos e a verificação de domínio do Caddy.

## O que já está pronto e o que falta
**Pronto:**
- Banco por cliente • login por e-mail ou CPF • cadastro por convite • teste de 20 dias com bloqueio automático e carência.
- Painel do dono: números, clientes, convites, pagamentos, e-mails, sugestões, planos (preços e limites editáveis), registro de auditoria.
  Não existe tela nem rota que mostre aves, fotos ou mensagens de um criatório.
- E-mail: confirmação de cadastro, recuperar senha, avisos de vencimento • pagamentos manuais e webhook do Asaas.
- Backup completo e restauração pelo próprio criador • importação de aves por planilha (Excel/CSV, com detecção de colunas) •
  limite de aves por plano.
- CIG e laudo de sexagem só aparecem no site se o criador marcar "mostrar" em cada ave (quem já tinha documento publicado continua publicado).
- Limites do plano conferidos no servidor (3 fotos/ave, galeria 50/80, 5 banners), imagens reduzidas no aparelho.
- Plano "só site" (menu reduzido, sem impressão, site com marca d'água) e "só gerenciador" (sem site).
- Proteção contra scripts em tudo que é digitado • privacidade do site (CPF/endereço nunca saem) • dados do dono antigo removidos do código.
- Correção da Reprodução (finalizar, anilha atual do filhote, sem duplicar).
- Arquivos para o servidor final: Caddy (HTTPS automático seguro), serviço, instalador e backup diário.

**Ainda não feito / ressalvas:**
- Instalador, Caddyfile, backup.sh e webhook do Asaas **não foram executados em ambiente real** (só a lógica interna foi testada).
- A leitura de planilhas usa a biblioteca SheetJS carregada da internet (cdnjs); a lógica de colunas/datas/sexo foi testada, mas a leitura do arquivo .xlsx em si não.
- Cobrança automática de renovação (gerar o Pix/boleto sozinho) não existe: o cliente pede o plano, você cobra, e o pagamento renova (manual ou pelo webhook).
- Dados gravados antes das proteções (ex.: o criatório antigo) não são reescritos; só o que for salvo daqui para frente é limpo.
- Autenticação em duas etapas e QR code nos crachás não foram feitos.
