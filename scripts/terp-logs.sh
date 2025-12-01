#!/bin/bash
# TERP Log Retrieval Script
# Usage: ./terp-logs.sh [run|build|deploy|restart] [tail_count] [--follow]
#
# Examples:
#   ./terp-logs.sh                    # Last 100 run logs
#   ./terp-logs.sh build 500          # Last 500 build logs
#   ./terp-logs.sh run 100 --follow   # Follow run logs in real-time

set -e

# Load credentials from .env.logging if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env.logging" ]; then
    source "$PROJECT_ROOT/.env.logging"
fi

# Configuration
APP_ID="${DIGITALOCEAN_APP_ID:-1fd40be5-b9af-4e71-ab1d-3af0864a7da4}"
DO_API_TOKEN="${DIGITALOCEAN_API_TOKEN:-}"

# Parse arguments
LOG_TYPE="${1:-run}"
TAIL_COUNT="${2:-100}"
FOLLOW_FLAG=""

# Check for --follow flag
if [[ "$3" == "--follow" ]] || [[ "$2" == "--follow" ]]; then
    FOLLOW_FLAG="--follow"
    if [[ "$2" == "--follow" ]]; then
        TAIL_COUNT="100"
    fi
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== TERP Log Retrieval ===${NC}"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${YELLOW}doctl not found. Installing...${NC}"
    cd /tmp
    wget -q https://github.com/digitalocean/doctl/releases/download/v1.115.0/doctl-1.115.0-linux-amd64.tar.gz
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download doctl${NC}"
        exit 1
    fi
    tar xf doctl-1.115.0-linux-amd64.tar.gz
    sudo mv doctl /usr/local/bin/
    echo -e "${GREEN}doctl installed successfully${NC}"
    echo ""
fi

# Check if API token is set
if [ -z "$DO_API_TOKEN" ]; then
    echo -e "${RED}Error: DIGITALOCEAN_API_TOKEN environment variable not set${NC}"
    echo ""
    echo "Option 1: Create .env.logging file (recommended)"
    echo "  cp .env.logging.example .env.logging"
    echo "  # Edit .env.logging with actual token"
    echo ""
    echo "Option 2: Set environment variable"
    echo "  export DIGITALOCEAN_API_TOKEN=your_token_here"
    echo ""
    echo "Contact TERP admin for the actual token."
    exit 1
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo -e "${YELLOW}Authenticating with DigitalOcean...${NC}"
    doctl auth init -t $DO_API_TOKEN
    if [ $? -ne 0 ]; then
        echo -e "${RED}Authentication failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}Authentication successful${NC}"
    echo ""
fi

# Validate log type
case $LOG_TYPE in
    run|build|deploy|restart|run_restarted)
        ;;
    *)
        echo -e "${RED}Invalid log type: $LOG_TYPE${NC}"
        echo "Valid types: run, build, deploy, restart, run_restarted"
        exit 1
        ;;
esac

# Retrieve logs
echo -e "${GREEN}Fetching $LOG_TYPE logs...${NC}"
if [ -n "$FOLLOW_FLAG" ]; then
    echo -e "${YELLOW}Following logs in real-time (Ctrl+C to stop)${NC}"
    echo ""
    doctl apps logs $APP_ID --type $LOG_TYPE $FOLLOW_FLAG
else
    echo -e "${YELLOW}Last $TAIL_COUNT lines${NC}"
    echo ""
    doctl apps logs $APP_ID --type $LOG_TYPE --tail $TAIL_COUNT
fi
