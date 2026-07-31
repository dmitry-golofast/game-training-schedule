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

# 1. This server's public addresses — IPv4 AND global IPv6. We must know both,
#    because a hostname may resolve via an AAAA record and Let's Encrypt will
#    follow whichever address it gets. Enumerate via `ip` (hostname -I is
#    IPv4-biased and would miss the server's own IPv6, causing false negatives).
SERVER_IPS="$(
    {
        ip -4 addr show scope global 2>/dev/null | awk '/inet /  {print $2}';
        ip -6 addr show scope global 2>/dev/null | awk '/inet6 / {print $2}';
    } | cut -d/ -f1 | sort -u
)"
if [ -z "$SERVER_IPS" ]; then
    warn "Could not enumerate server IPs via 'ip'. DNS check will be skipped."
fi

# 2. Resolve every A/AAAA record for a host and require EACH to belong to this
#    server. A stray record (e.g. an AAAA pointing elsewhere) can make Let's
#    Encrypt validate against the wrong host and fail, so we abort before
#    hitting rate limits. getent ahostsv6 may emit IPv4-mapped IPv6
#    (::ffff:1.2.3.4); strip that prefix so IPv4 normalizes correctly.
check_dns() {
    local host="$1"
    local resolved ip bad=0

    resolved="$(
        {
            getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}';
            getent ahostsv6 "$host" 2>/dev/null | awk '{print $1}' | sed 's/^::ffff://';
        } | sort -u
    )"

    if [ -z "$resolved" ]; then
        fail "${host}: no A/AAAA record found."
        EXIT_CODE=1
        return 1
    fi

    if [ -z "$SERVER_IPS" ]; then
        ok "${host} → ${resolved//$'\n'/, } (server IPs unknown, not verified)"
        return 0
    fi

    while IFS= read -r ip; do
        [ -z "$ip" ] && continue
        if grep -qxF "$ip" <<< "$SERVER_IPS"; then
            ok "${host} → ${ip}"
        else
            fail "${host} resolves to ${ip}, which is NOT assigned to this server."
            fail "  Point this record at the server, or remove it — for an AAAA"
            fail "  record, delete it in your DNS panel (e.g. nic.ru)."
            bad=1
            EXIT_CODE=1
        fi
    done <<< "$resolved"

    return $bad
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
# The certbot service in docker-compose.yml overrides `entrypoint` to a
# `/bin/sh -c` renew loop (for the always-on auto-renew daemon). That
# entrypoint is sticky for `docker compose run`, so our CLI args would be
# glued onto `/bin/sh -c` and the command would fail with "certonly: not
# found". Override the entrypoint back to the certbot binary for THIS
# one-shot invocation only — the renew daemon container is untouched.
docker compose run --rm --entrypoint certbot certbot certonly \
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
# The certbot container's sticky `/bin/sh -c` entrypoint would swallow a
# bare `openssl ...`, so invoke it via an explicit shell command.
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/cert.pem"
CERT_INFO="$(docker compose exec -T certbot /bin/sh -c "openssl x509 -in '$CERT_PATH' -noout -dates" 2>/dev/null || true)"
if [ -n "$CERT_INFO" ]; then
    echo "  Certificate dates:"
    echo "$CERT_INFO" | sed 's/^/    /'
else
    warn "Could not read certificate dates. Manual check:"
    warn "  docker compose exec certbot /bin/sh -c \"openssl x509 -in $CERT_PATH -noout -dates\""
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
echo "Manual renew test:"
echo "  docker compose run --rm --entrypoint certbot certbot renew --dry-run"
