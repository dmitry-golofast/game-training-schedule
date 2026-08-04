#!/bin/bash
#
# Deploy script for eventfit.ru
# Run on the server: ./deploy.sh
#
set -euo pipefail

REPO_URL="https://github.com/dmitrygolofast/game-training-schedule.git"
APP_DIR="/opt/eventfit"
BRANCH="main"

echo "=== eventFit Deploy ==="

# Clone or pull
if [ -d "$APP_DIR/.git" ]; then
    echo ">>> Updating repository..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
else
    echo ">>> Cloning repository..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Check .env
if [ ! -f .env ]; then
    echo ">>> Creating .env from template..."
    cp .env.production.example .env
    echo "!!! Fill in the secrets in .env, then run this script again."
    exit 1
fi

echo ">>> Building and starting containers..."
docker compose down
docker compose build --no-cache app
docker compose up -d

echo ""
echo "=== Deploy complete ==="
echo "App:       http://$(hostname -I | awk '{print $1}'):3000"
echo "Containers:"
docker compose ps
echo ""
echo "Next steps:"
echo "  1. Run ./deploy-ssl.sh to obtain SSL certificates"
echo "  2. Set up cron for reminders:"
echo "     crontab -e"
echo "     0 * * * * curl -s -H 'Authorization: Bearer YOUR_CRON_SECRET' https://eventfit.ru/api/cron/send-reminders"
