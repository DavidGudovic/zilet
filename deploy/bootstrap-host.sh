#!/bin/bash
set -euo pipefail
cd /var/www/html/zilet
nginx -t
install -d -m 755 /var/www/letsencrypt
if [ ! -f /etc/letsencrypt/live/zilet.me/fullchain.pem ]; then
  cat > /etc/nginx/sites-available/zilet.me <<'NGINX'
server {
    listen 80;
    server_name zilet.me;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 503; }
}
NGINX
  ln -sfn /etc/nginx/sites-available/zilet.me /etc/nginx/sites-enabled/zilet.me
  nginx -t
  systemctl reload nginx
  certbot certonly --webroot -w /var/www/letsencrypt -d zilet.me --non-interactive --keep-until-expiring
fi
install -m 644 deploy/nginx.conf /etc/nginx/sites-available/zilet.me
ln -sfn /etc/nginx/sites-available/zilet.me /etc/nginx/sites-enabled/zilet.me
nginx -t
systemctl reload nginx
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/zilet-nginx-reload <<'HOOK'
#!/bin/sh
set -eu
/usr/sbin/nginx -t
/bin/systemctl reload nginx
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/zilet-nginx-reload
install -m 755 deploy/zilet-deploy /usr/local/bin/zilet-deploy
install -m 644 deploy/zilet-deploy.service deploy/zilet-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now zilet-deploy.timer
systemctl is-active nginx zilet-deploy.timer
