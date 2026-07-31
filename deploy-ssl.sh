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
WILDCARDS=("www.${DOMAIN}" "app.${DOMAIN}")
EMAIL="${1:-admin@${DOMAIN}}"
APP_DIR="/opt/slotory"
EXIT_CODE=0

# ── Helpers ────────────────────────────────────────────────────
c_red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
c_green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
c_yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
c_bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

step() { echo ""; c_bold ">>> $*"; }
ok()   { c_green "  ✓ $*"; }
warn() { c_yellow "  ! $*"; }
fail() { c_red "  ✗ $*"; }

cd "$APP_DIR"

echo ""
c_bold "=== SSL Setup for ${DOMAIN} ==="

# ── Pre-flight checks ──────────────────────────────────────────
step "Pre-flight checks"

# 1. This server's public IPv4 (first non-loopback address).
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -z "$SERVER_IP" ]; then
    warn "Could not detect server IP via 'hostname -I'. DNS check will be skipped."
fi

# 2. Resolve each hostname and compare to the server IP. A mismatch means
#    Let's Encrypt validation will fail, so we abort before hitting rate limits.
check_dns() {
    local host="$1"
    local resolved
    resolved="$(getent hosts "$host" 2>/dev/null | awk '{print $1}' | head -n1)"
    if [ -z "$resolved" ]; then
        # Fall back to dig/host if getent has no record (e.g. no nsswitch DNS).
        resolved="$(dig +short "$host" A 2>/dev/null | grep -E '^[0-9]' | head -n1)"
    fi
    if [ -z "$resolved" ]; then
        fail "${host}: DNS record not found."
        EXIT_CODE=1
        return 1
    fi
    if [ -n "$SERVER_IP" ] && [ "$resolved" != "$SERVER_IP" ]; then
        fail "${host} resolves to ${resolved}, but this server is ${SERVER_IP}."
        fail "Point DNS at this server first, or certbot validation will fail."
        EXIT_CODE=1
        return 1
    fi
    ok "${host} → ${resolved}"
    return 0
}

check_dns "$DOMAIN" || true
for h in "${WILDCARDS[@]}"; do
    check_dns "$h" || true
done

# 3. Make sure nginx is up and answering on port 80 (webroot challenge needs it).
if ! docker compose ps nginx 2>/dev/null | grep -q "Up"; then
    fail "nginx container is not running. Start the stack first: docker compose up -d"
    EXIT_CODE=1
fi

# 4. .env must advertise HTTPS for cookies/redirects to behave correctly.
if [ -f .env ] && ! grep -q "^NEXT_PUBLIC_SERVER_URL=https://${DOMAIN}" .env; then
    warn ".env: NEXT_PUBLIC_SERVER_URL should be https://${DOMAIN} (found otherwise)."
    warn "Fix it before re-deploying the app so session cookies are 'secure'."
fi

if [ "$EXIT_CODE" -ne 0 ]; then
    echo ""
    c_red "Pre-flight checks failed. Aborting before Let's Encrypt (rate-limit safe)."
    exit "$EXIT_CODE"
fi
ok "Pre-flight checks passed."

# ── Step 1: Obtain certificate ─────────────────────────────────
step "Requesting certificate from Let's Encrypt (webroot mode)..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.${DOMAIN}" \
    -d "app.${DOMAIN}"

# ── Step 2: Activate the SSL nginx config ──────────────────────
step "Switching nginx to HTTPS config..."
cp nginx/slotory.ru.ssl.conf.disabled nginx/slotory.ru.conf
ok "nginx/slotory.ru.conf replaced with the SSL version."

# ── Step 3: Reload nginx ───────────────────────────────────────
step "Reloading nginx..."
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
ok "nginx reloaded with the new config."

# ── Post-flight checks ─────────────────────────────────────────
step "Post-flight checks"

# Wait a moment for nginx to settle on the new config.
sleep 2

# 1. HTTP → HTTPS redirect (expect 301).
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://${DOMAIN}" || true)"
if [ "$HTTP_CODE" = "301" ]; then
    ok "http://${DOMAIN} → 301 redirect to HTTPS."
else
    warn "http://${DOMAIN} returned HTTP ${HTTP_CODE}, expected 301. Check nginx logs."
fi

# 2. HTTPS endpoint actually serves the app (expect 200/302/307).
HTTPS_CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://${DOMAIN}" || true)"
case "$HTTPS_CODE" in
    200|302|307) ok "https://${DOMAIN} → HTTP ${HTTPS_CODE} (serving)." ;;
    *)           warn "https://${DOMAIN} returned HTTP ${HTTPS_CODE}, expected 200/302/307." ;;
esac

# 3. Certificate validity window (certbot leaves the dates on disk).
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/cert.pem"
CERT_INFO="$(docker compose exec -T certbot openssl x509 -in "$CERT_PATH" -noout -dates 2>/dev/null || true)"
if [ -n "$CERT_INFO" ]; then
    echo "  Certificate dates:"
    echo "$CERT_INFO" | sed 's/^/    /'
else
    warn "Could not read certificate dates (openssl). Manual check: docker compose exec certbot openssl x509 -in $CERT_PATH -noout -dates"
fi

# 4. Auto-renewal container present.
if docker compose ps certbot 2>/dev/null | grep -q "Up"; then
    ok "certbot container is up (auto-renew every 6h)."
else
    warn "certbot container is not running — certificates will NOT auto-renew."
    warn "Fix with: docker compose up -d certbot"
fi

echo ""
c_green "=== SSL setup complete ==="
echo "Site is now available at https://${DOMAIN}"
echo ""
echo "Certificates auto-renew via the certbot container."
echo "Manual renew test: docker compose run --rm certbot renew --dry-run"
