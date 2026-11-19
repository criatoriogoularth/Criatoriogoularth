#!/usr/bin/env bash
# Instala o Aviari num VPS Ubuntu 22.04/24.04 (ou Debian 12) LIMPO: Node, Postgres, Caddy (HTTPS),
# serviço do sistema, firewall e backup diário.
#
# Antes: envie a pasta do projeto para /opt/aviari  (ex.: unzip aviari-v2-multicliente.zip -d /opt/aviari)
# Depois, como root:
#   bash /opt/aviari/deploy/instalar-vps.sh  seudominio.com.br  voce@email.com  "SuaSenhaDeDono"
#
# ⚠️ Escrito para o roteiro padrão dessas distribuições, mas NÃO foi executado num servidor de verdade por quem o escreveu.
#    Rode num VPS novo, leia as mensagens, e se algum passo falhar, o script para (set -e) sem deixar nada pela metade perigosa.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Rode como root:  sudo bash $0 ..."; exit 1; }
DOMINIO="${1:?Uso: $0 seudominio.com.br seu@email.com SenhaDoDono}"
EMAIL="${2:?Informe o e-mail (usado pelo Lets Encrypt e como login do dono)}"
SENHA_DONO="${3:?Informe a senha do dono (8+ caracteres)}"
APP=/opt/aviari
[ -f "$APP/package.json" ] || { echo "Não achei $APP/package.json — envie o projeto para $APP primeiro."; exit 1; }
[ ${#SENHA_DONO} -ge 8 ] || { echo "A senha do dono precisa ter 8+ caracteres."; exit 1; }

echo "▶ Pacotes do sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg postgresql postgresql-contrib ufw unzip openssl \
                   debian-keyring debian-archive-keyring apt-transport-https

echo "▶ Node.js 20"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "▶ Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "▶ Usuário do sistema"
id aviari >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin aviari

echo "▶ Postgres (papel com permissão para criar um banco por cliente)"
SENHA_PG="$(openssl rand -hex 24)"
if sudo -u postgres psql -Atc "SELECT 1 FROM pg_roles WHERE rolname='aviari'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER ROLE aviari WITH PASSWORD '$SENHA_PG'"
else
  sudo -u postgres psql -c "CREATE ROLE aviari LOGIN CREATEDB PASSWORD '$SENHA_PG'"
fi
sudo -u postgres psql -Atc "SELECT 1 FROM pg_database WHERE datname='aviari_mestre'" | grep -q 1 || sudo -u postgres createdb -O aviari aviari_mestre

echo "▶ Arquivo .env (segredos gerados agora — GUARDE UMA CÓPIA da APP_KEY)"
if [ -f "$APP/.env" ]; then
  echo "  (já existe $APP/.env — mantido; a senha nova do Postgres NÃO foi gravada nele)"
else
  cat > "$APP/.env" <<ENV
MASTER_DATABASE_URL=postgresql://aviari:${SENHA_PG}@127.0.0.1:5432/aviari_mestre
ADMIN_DATABASE_URL=postgresql://aviari:${SENHA_PG}@127.0.0.1:5432/postgres
PGSSL=false
JWT_SECRET=$(openssl rand -hex 48)
APP_KEY=$(openssl rand -hex 32)
BASE_DOMAIN=${DOMINIO}
APP_URL=https://app.${DOMINIO}
ACME_EMAIL=${EMAIL}
PORT=3000
MAX_TENANT_POOLS=20
# E-mail (preencha UM dos dois para ativar o envio real):
# RESEND_API_KEY=
# EMAIL_FROM=Aviari <nao-responda@${DOMINIO}>
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# Pagamentos pelo Asaas (opcional):
# ASAAS_WEBHOOK_TOKEN=
ENV
fi
chown -R aviari:aviari "$APP"
chmod 600 "$APP/.env"

echo "▶ Dependências do projeto e banco mestre"
sudo -u aviari bash -c "cd $APP && npm install --omit=dev --no-audit --no-fund && node scripts/init-master.js && node scripts/criar-dono.js '$EMAIL' '$SENHA_DONO' 'Dono'"

echo "▶ Serviço do sistema"
cp "$APP/deploy/aviari.service" /etc/systemd/system/aviari.service
systemctl daemon-reload && systemctl enable --now aviari

echo "▶ Caddy (HTTPS automático)"
cp "$APP/deploy/Caddyfile" /etc/caddy/Caddyfile
# o Caddy precisa do e-mail do Let's Encrypt
mkdir -p /etc/systemd/system/caddy.service.d
cat > /etc/systemd/system/caddy.service.d/aviari.conf <<CONF
[Service]
Environment=ACME_EMAIL=${EMAIL}
CONF
systemctl daemon-reload && systemctl restart caddy

echo "▶ Backup diário"
install -m 755 "$APP/deploy/backup.sh" /usr/local/bin/aviari-backup
echo "0 3 * * * root /usr/local/bin/aviari-backup >> /var/log/aviari-backup.log 2>&1" > /etc/cron.d/aviari-backup

echo "▶ Firewall"
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

cat <<FIM

✅ Instalado. Falta só o DNS (no painel do seu domínio, ex.: Cloudflare — deixe a nuvem CINZA / "somente DNS"):
   A   app.${DOMINIO}     →  IP deste servidor
   A   ${DOMINIO}         →  IP deste servidor
   A   *.${DOMINIO}       →  IP deste servidor      (todos os sites dos criatórios)

Depois acesse  https://app.${DOMINIO}/login.html  com ${EMAIL}  (painel do dono).
Guarde uma cópia de:  ${APP}/.env  (principalmente APP_KEY) — sem ela os bancos dos clientes não abrem.
Backups diários ficam em /var/backups/aviari  (veja deploy/backup.sh para enviar para fora do servidor).
FIM
