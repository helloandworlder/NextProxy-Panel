#!/bin/bash
set -e

# Panel Agent Installation Script
# Usage: curl -fsSL https://your-panel.com/install.sh | bash -s -- --panel-url https://panel.example.com --node-token YOUR_TOKEN

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
PANEL_URL=""
NODE_TOKEN=""
XRAY_VERSION="24.12.18"
AGENT_VERSION="latest"
INSTALL_DIR="/opt/panel-agent"
CONFIG_DIR="/etc/panel-agent"
LOG_DIR="/var/log/panel-agent"
API_PREFIX="api"
API_VERSION=""

# Print functions
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --panel-url) PANEL_URL="$2"; shift 2 ;;
        --node-token) NODE_TOKEN="$2"; shift 2 ;;
        --xray-version) XRAY_VERSION="$2"; shift 2 ;;
        --agent-version) AGENT_VERSION="$2"; shift 2 ;;
        --api-prefix) API_PREFIX="$2"; shift 2 ;;
        --api-version) API_VERSION="$2"; shift 2 ;;
        --help) 
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --panel-url URL       Panel API URL (required)"
            echo "  --node-token TOKEN    Node authentication token (required)"
            echo "  --xray-version VER    Xray version (default: $XRAY_VERSION)"
            echo "  --agent-version VER   Agent version (default: latest)"
            echo "  --api-prefix PREFIX   API prefix (default: api)"
            echo "  --api-version VER     API version (default: empty)"
            exit 0 ;;
        *) error "Unknown option: $1" ;;
    esac
done

# Validate required parameters
[[ -z "$PANEL_URL" ]] && error "Missing required parameter: --panel-url"
[[ -z "$NODE_TOKEN" ]] && error "Missing required parameter: --node-token"

# Detect OS and architecture
detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64|amd64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) error "Unsupported architecture: $ARCH" ;;
    esac
    
    case $OS in
        linux) OS="linux" ;;
        darwin) OS="darwin" ;;
        *) error "Unsupported OS: $OS" ;;
    esac
    
    info "Detected platform: $OS/$ARCH"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Install dependencies
install_deps() {
    info "Installing dependencies..."
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq curl wget unzip
    elif command -v yum &> /dev/null; then
        yum install -y -q curl wget unzip
    elif command -v apk &> /dev/null; then
        apk add --no-cache curl wget unzip
    fi
}

# Install Xray
install_xray() {
    info "Installing Xray v$XRAY_VERSION..."
    
    local XRAY_URL="https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-${OS}-${ARCH}.zip"
    local TMP_DIR=$(mktemp -d)
    
    wget -q -O "$TMP_DIR/xray.zip" "$XRAY_URL" || error "Failed to download Xray"
    unzip -q "$TMP_DIR/xray.zip" -d "$TMP_DIR"
    
    install -m 755 "$TMP_DIR/xray" /usr/local/bin/xray
    mkdir -p /usr/local/share/xray
    [[ -f "$TMP_DIR/geoip.dat" ]] && install -m 644 "$TMP_DIR/geoip.dat" /usr/local/share/xray/
    [[ -f "$TMP_DIR/geosite.dat" ]] && install -m 644 "$TMP_DIR/geosite.dat" /usr/local/share/xray/
    
    rm -rf "$TMP_DIR"
    
    info "Xray installed: $(/usr/local/bin/xray version | head -1)"
}

# Install Agent
install_agent() {
    info "Installing Panel Agent..."
    
    mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$LOG_DIR"
    
    # Download agent binary (placeholder - replace with actual download URL)
    # For now, assume agent binary is provided or built locally
    if [[ -f "./agent-${OS}-${ARCH}" ]]; then
        install -m 755 "./agent-${OS}-${ARCH}" "$INSTALL_DIR/agent"
    elif [[ -f "./agent" ]]; then
        install -m 755 "./agent" "$INSTALL_DIR/agent"
    else
        warn "Agent binary not found. Please copy agent binary to $INSTALL_DIR/agent manually."
    fi
}

# Create configuration
create_config() {
    info "Creating configuration..."
    
    cat > "$CONFIG_DIR/config.yaml" << EOF
# Panel Agent Configuration
panel_url: "$PANEL_URL"
node_token: "$NODE_TOKEN"

# API path configuration
api:
  prefix: "$API_PREFIX"
  version: "$API_VERSION"

# Xray paths
xray_binary_path: "/usr/local/bin/xray"
xray_config_path: "$CONFIG_DIR/xray.json"
xray_asset_path: "/usr/local/share/xray"

# Polling intervals (seconds)
config_poll_interval: 30
user_poll_interval: 30
traffic_report_interval: 10
status_report_interval: 10
alive_poll_interval: 60

# HTTP client settings
http_timeout: 30
http_retry_count: 3

# Logging
log_level: "info"
log_file: "$LOG_DIR/agent.log"
EOF

    # Create empty xray config
    echo '{}' > "$CONFIG_DIR/xray.json"
    
    info "Configuration created at $CONFIG_DIR/config.yaml"
}

# Create systemd service
create_systemd_service() {
    info "Creating systemd service..."
    
    cat > /etc/systemd/system/panel-agent.service << EOF
[Unit]
Description=Panel Agent
After=network.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/agent -config $CONFIG_DIR/config.yaml
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/agent.log
StandardError=append:$LOG_DIR/agent.log

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable panel-agent
    
    info "Systemd service created"
}

# Start service
start_service() {
    info "Starting Panel Agent..."
    systemctl start panel-agent
    sleep 2
    
    if systemctl is-active --quiet panel-agent; then
        info "Panel Agent started successfully"
    else
        warn "Panel Agent may not have started correctly. Check logs: journalctl -u panel-agent"
    fi
}

# Main installation
main() {
    echo "========================================"
    echo "  Panel Agent Installation Script"
    echo "========================================"
    echo ""
    
    check_root
    detect_platform
    install_deps
    install_xray
    install_agent
    create_config
    create_systemd_service
    start_service
    
    echo ""
    echo "========================================"
    info "Installation complete!"
    echo "========================================"
    echo ""
    echo "Configuration: $CONFIG_DIR/config.yaml"
    echo "Logs: $LOG_DIR/agent.log"
    echo ""
    echo "Commands:"
    echo "  systemctl status panel-agent   - Check status"
    echo "  systemctl restart panel-agent  - Restart agent"
    echo "  journalctl -u panel-agent -f   - View logs"
    echo ""
}

main
