#!/bin/bash
#
# Initial SSL certificate setup for slotory.ru via Let's Encrypt.
#
# Prerequisites:
#   1. Domain slotory.ru must point to this server's IP.
#   2. docker compose up -d (nginx running with HTTP-only config).
#   3. Run: ./deploy-ssl.sh your@email.ru
#
set -euo pipefail

DOMAIN="slotory.ru"
EMAIL="${1:-admin@slotory.ru}"
APP_DIR="/opt/slotory"

cd "$APP_DIR"

echo "=== SSL Setup for $DOMAIN ==="

# Step 1: Get certificate via certbot (webroot mode through nginx HTTP server)
echo ">>> Requesting certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Step 2: Replace nginx config with SSL version
echo ">>> Switching nginx to HTTPS config..."
cp nginx/slotory.ru.ssl.conf nginx/slotory.ru.conf

# Step 3: Restart nginx to pick up certificates + new config
echo ">>> Restarting nginx..."
docker compose restart nginx

echo ""
echo "=== SSL setup complete ==="
echo "Site is now available at https://$DOMAIN"
echo ""
echo "Certificates auto-renew via the certbot container."
echo "Manual renew test: docker compose run --rm certbot renew --dry-run"
