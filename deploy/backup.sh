#!/usr/bin/env bash
# Backup diário de TODOS os bancos do Aviari (o mestre + um por cliente).
# Guarda os últimos 14 dias em /var/backups/aviari. Para copiar para FORA do servidor (obrigatório
# para valer como backup de verdade), configure o rclone (Google Drive, Backblaze B2, S3...) e defina:
#   RCLONE_DESTINO="meudrive:aviari-backups"
# em /etc/default/aviari-backup  (uma linha:  RCLONE_DESTINO=...).
set -euo pipefail
[ -f /etc/default/aviari-backup ] && . /etc/default/aviari-backup
DEST=/var/backups/aviari
DIAS=${DIAS_GUARDAR:-14}
HOJE=$(date +%Y-%m-%d)
mkdir -p "$DEST/$HOJE"; chmod 700 "$DEST" "$DEST/$HOJE"

for banco in $(sudo -u postgres psql -Atc "SELECT datname FROM pg_database WHERE datname = 'aviari_mestre' OR datname LIKE 'aviari\_%'"); do
  sudo -u postgres pg_dump --format=custom --compress=6 "$banco" > "$DEST/$HOJE/$banco.dump"
  echo "ok  $banco  ($(du -h "$DEST/$HOJE/$banco.dump" | cut -f1))"
done
# cópia do .env (contém a APP_KEY — sem ela os bancos dos clientes não abrem)
cp /opt/aviari/.env "$DEST/$HOJE/env.bak"; chmod 600 "$DEST/$HOJE/env.bak"

# apaga o que passou de X dias
find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +"$DIAS" -exec rm -rf {} +

if [ -n "${RCLONE_DESTINO:-}" ]; then
  rclone copy "$DEST/$HOJE" "$RCLONE_DESTINO/$HOJE" && echo "enviado para $RCLONE_DESTINO/$HOJE"
else
  echo "⚠️  RCLONE_DESTINO não configurado: o backup está só neste servidor."
fi
echo "Backup de $HOJE concluído."

# Para restaurar UM cliente:  sudo -u postgres pg_restore --clean --if-exists -d aviari_NOMEDOCLIENTE /var/backups/aviari/AAAA-MM-DD/aviari_NOMEDOCLIENTE.dump
