#!/bin/bash
# Panel Agent Installation Script
# Usage: curl -fsSL https://panel.example.com/install.sh | bash -s -- --token=xxx --panel=https://panel.example.com

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
INSTALL_DIR="/opt/panel-agent"
CONFIG_DIR="/etc/panel-agent"
LOG_DIR="/var/log/panel-agent"
SERVICE_NAME="panel-agent"
XRAY_VERSION="latest"
AGENT_VERSION="latest"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --token=*) NODE_TOKEN="${1#*=}"; shift ;;
    --panel=*) PANEL_URL="${1#*=}"; shift ;;
    --xray-version=*) XRAY_VERSION="${1#*=}"; shift ;;
    --agent-version=*) AGENT_VERSION="${1#*=}"; shift ;;
    *) shift ;;
  esac
done

# Validate required arguments
if [ -z "$NODE_TOKEN" ] || [ -z "$PANEL_URL" ]; then
  echo -e "${RED}Error: --token and --panel are required${NC}"
  echo "Usage: $0 --token=<node_token> --panel=<panel_url>"
  exit 1
fi

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect OS
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
  else
    log_error "Cannot detect OS"
    exit 1
  fi
  log_info "Detected OS: $OS $VERSION"
}

# Detect architecture
detect_arch() {
  ARCH=$(uname -m)
  case $ARCH in
    x86_64) ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    armv7l) ARCH="arm" ;;
    *) log_error "Unsupported architecture: $ARCH"; exit 1 ;;
  esac
  log_info "Detected architecture: $ARCH"
}

# Install dependencies
install_deps() {
  log_info "Installing dependencies..."
  case $OS in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq curl wget unzip jq
      ;;
    centos|rhel|fedora|rocky|almalinux)
      yum install -y -q curl wget unzip jq
      ;;
    *)
      log_warn "Unknown OS, assuming dependencies are installed"
      ;;
  esac
}

# Install Xray-core
install_xray() {
  log_info "Installing Xray-core..."
  
  if [ "$XRAY_VERSION" = "latest" ]; then
    XRAY_VERSION=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest | jq -r '.tag_name')
  fi
  
  XRAY_URL="https://github.com/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-linux-${ARCH}.zip"
  
  mkdir -p /tmp/xray
  curl -sL "$XRAY_URL" -o /tmp/xray/xray.zip
  unzip -q /tmp/xray/xray.zip -d /tmp/xray
  
  mv /tmp/xray/xray /usr/local/bin/xray
  chmod +x /usr/local/bin/xray
  
  # Download geoip and geosite
  curl -sL "https://github.com/v2fly/geoip/releases/latest/download/geoip.dat" -o /usr/local/bin/geoip.dat
  curl -sL "https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat" -o /usr/local/bin/geosite.dat
  
  rm -rf /tmp/xray
  log_info "Xray-core ${XRAY_VERSION} installed"
}

# Install Agent
install_agent() {
  log_info "Installing Panel Agent..."
  
  mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$LOG_DIR"
  
  # Download agent binary (replace with actual download URL)
  AGENT_URL="${PANEL_URL}/downloads/agent-linux-${ARCH}"
  curl -sL "$AGENT_URL" -o "$INSTALL_DIR/agent" || {
    log_warn "Could not download agent, using placeholder"
    echo "#!/bin/bash" > "$INSTALL_DIR/agent"
    echo "echo 'Agent binary not found'" >> "$INSTALL_DIR/agent"
  }
  chmod +x "$INSTALL_DIR/agent"
  
  log_info "Agent installed to $INSTALL_DIR"
}

# Generate config
generate_config() {
  log_info "Generating configuration..."
  
  cat > "$CONFIG_DIR/config.yaml" << EOF
# Panel Agent Configuration
# Generated: $(date)

panel:
  url: ${PANEL_URL}
  token: ${NODE_TOKEN}

xray:
  binary: /usr/local/bin/xray
  config_path: ${CONFIG_DIR}/xray.json
  asset_path: /usr/local/bin

intervals:
  config_poll: 30s
  user_poll: 30s
  traffic_report: 10s
  status_report: 10s
  alive_report: 60s

log:
  level: info
  path: ${LOG_DIR}/agent.log
EOF

  log_info "Configuration saved to $CONFIG_DIR/config.yaml"
}

# Create systemd service
create_service() {
  log_info "Creating systemd service..."
  
  cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Panel Agent
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/agent -config ${CONFIG_DIR}/config.yaml
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  log_info "Systemd service created"
}

# Start service
start_service() {
  log_info "Starting Panel Agent..."
  systemctl start ${SERVICE_NAME}
  
  sleep 2
  if systemctl is-active --quiet ${SERVICE_NAME}; then
    log_info "Panel Agent started successfully"
  else
    log_error "Failed to start Panel Agent"
    journalctl -u ${SERVICE_NAME} --no-pager -n 20
    exit 1
  fi
}

# Main
main() {
  echo "========================================"
  echo "  Panel Agent Installation Script"
  echo "========================================"
  echo ""
  
  # Check root
  if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root"
    exit 1
  fi
  
  detect_os
  detect_arch
  install_deps
  install_xray
  install_agent
  generate_config
  create_service
  start_service
  
  echo ""
  echo "========================================"
  log_info "Installation completed!"
  echo ""
  echo "Commands:"
  echo "  systemctl status ${SERVICE_NAME}  - Check status"
  echo "  systemctl restart ${SERVICE_NAME} - Restart agent"
  echo "  journalctl -u ${SERVICE_NAME} -f  - View logs"
  echo ""
  echo "Config: ${CONFIG_DIR}/config.yaml"
  echo "Logs:   ${LOG_DIR}/agent.log"
  echo "========================================"
}

main
