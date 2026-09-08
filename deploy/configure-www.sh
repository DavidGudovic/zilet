#!/usr/bin/env bash
# Add www to the existing Žilet virtual host and certificate; preserve other sites.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run this script with sudo.' >&2; exit 1; }
exec 9>/run/lock/zilet-www.lock
flock -n 9 || { echo 'Another www setup is running.' >&2; exit 1; }
site=/etc/nginx/sites-available/zilet.me
nginx -t
work=$(mktemp -d /tmp/zilet-www.XXXXXXXX)
cp -- "$site" "$work/original.conf"
changed=false
complete=false
cleanup() {
    result=$?
    trap - EXIT
    if [[ $changed == true && $complete == false ]]; then
        echo 'Restoring the original Žilet virtual host.' >&2
        install -m 644 "$work/original.conf" "$site"
        nginx -t && systemctl reload nginx
    fi
    rm -rf -- "$work"
    exit "$result"
}
trap cleanup EXIT
python3 - "$work" <<'PY'
from pathlib import Path
import sys
work = Path(sys.argv[1])
source = (work / 'original.conf').read_text()
redirect = '''
# Canonical hostname: complete TLS before redirecting www visitors.
server {
    listen 443 ssl http2;
    server_name www.zilet.me;
    ssl_certificate /etc/letsencrypt/live/zilet.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zilet.me/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    access_log /var/log/nginx/zilet.access.log;
    error_log /var/log/nginx/zilet.error.log;
    return 301 https://zilet.me$request_uri;
}
'''
if source.endswith(redirect) and 'server_name zilet.me www.zilet.me;' in source:
    http = final = source
else:
    if 'www.zilet.me' in source or source.count('server_name zilet.me;') != 2:
        raise SystemExit('Unexpected virtual-host configuration; inspect it before changing it.')
    first = source.split('server_name zilet.me;', 1)[0]
    if 'listen 80;' not in first or 'listen 443' in first:
        raise SystemExit('The first server must be the existing HTTP virtual host.')
    http = source.replace('server_name zilet.me;', 'server_name zilet.me www.zilet.me;', 1)
    final = http.rstrip() + '\n' + redirect
(work / 'http.conf').write_text(http)
(work / 'final.conf').write_text(final)
PY
backup="/var/backups/zilet-nginx-$(date -u +%Y%m%dT%H%M%SZ).conf"
install -m 600 "$work/original.conf" "$backup"
# Refuse to overwrite an administrator's concurrent edit.
cmp -s "$site" "$work/original.conf" || { echo 'Configuration changed during preparation.' >&2; exit 1; }
changed=true
install -m 644 "$work/http.conf" "$site"
nginx -t
systemctl reload nginx
# Webroot validation avoids stopping Nginx or touching another virtual host.
if ! openssl x509 -in /etc/letsencrypt/live/zilet.me/fullchain.pem -noout -ext subjectAltName | grep -Eq 'DNS:www[.]zilet[.]me(,|[[:space:]]*$)'; then
    certbot certonly --webroot -w /var/www/letsencrypt --cert-name zilet.me \
        -d zilet.me -d www.zilet.me --expand --non-interactive
fi
install -m 644 "$work/final.conf" "$site"
nginx -t
systemctl reload nginx
# --resolve avoids a stale local DNS cache while still verifying TLS for the real hostname.
location=$(curl --fail --silent --show-error --max-time 15 --resolve www.zilet.me:443:127.0.0.1 \
    -o /dev/null -w '%{redirect_url}' 'https://www.zilet.me/rubrika/citaoci?proba=1')
[[ $location == 'https://zilet.me/rubrika/citaoci?proba=1' ]]
curl --fail --silent --show-error --max-time 15 --resolve zilet.me:443:127.0.0.1 https://zilet.me/api/health
complete=true
printf '\nwww HTTPS and canonical redirect are configured. Original Nginx file: %s\n' "$backup"
# Check the existing automatic-renewal path against the staging CA.
certbot renew --cert-name zilet.me --dry-run
systemctl is-active certbot.timer
