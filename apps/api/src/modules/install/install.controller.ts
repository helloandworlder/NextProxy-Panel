import { Controller, Get, Post, Body, Query, Res, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RequireScopes } from '../auth/decorators';
import { ScopesGuard } from '../auth/guards';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Install')
@Controller('install')
export class InstallController {
  private installScript: string;

  constructor(private prisma: PrismaService) {
    // Load install script at startup
    const scriptPath = path.join(__dirname, '../../../scripts/install.sh');
    try {
      this.installScript = fs.existsSync(scriptPath) 
        ? fs.readFileSync(scriptPath, 'utf-8')
        : this.getEmbeddedScript();
    } catch {
      this.installScript = this.getEmbeddedScript();
    }
  }

  @Get('script')
  @ApiOperation({ summary: 'Get installation script' })
  getScript(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="install.sh"');
    res.send(this.installScript);
  }

  @Get('command')
  @UseGuards(AuthGuard('jwt'), ScopesGuard)
  @ApiBearerAuth()
  @RequireScopes('nodes:write')
  @ApiOperation({ summary: 'Generate one-click install command with token' })
  @ApiQuery({ name: 'nodeId', required: false, description: 'Existing node ID to get token' })
  @ApiQuery({ name: 'name', required: false, description: 'Name for new node' })
  async getInstallCommand(
    @Req() req: AuthenticatedRequest,
    @Query('nodeId') nodeId?: string,
    @Query('name') name?: string,
  ) {
    const tenantId = req.user.tenantId;
    let token: string;
    let nodeName: string;

    if (nodeId) {
      // Get existing node token
      const node = await this.prisma.node.findFirst({
        where: { id: nodeId, tenantId },
        select: { token: true, name: true },
      });
      if (!node) throw new Error('Node not found');
      token = node.token;
      nodeName = node.name;
    } else {
      // Create new node with temporary token
      nodeName = name || `Node-${Date.now().toString(36)}`;
      token = randomBytes(32).toString('hex');
      
      await this.prisma.node.create({
        data: {
          tenantId,
          name: nodeName,
          token,
          nodeType: 'standard',
          status: 'pending',
        },
      });
    }

    // Get panel URL from request or config
    const panelUrl = `${req.protocol}://${req.get('host')}`;
    
    // Generate install commands
    const curlCommand = `curl -fsSL ${panelUrl}/api/install/script | sudo bash -s -- --token=${token} --panel=${panelUrl}`;
    const wgetCommand = `wget -qO- ${panelUrl}/api/install/script | sudo bash -s -- --token=${token} --panel=${panelUrl}`;

    return {
      nodeName,
      token,
      panelUrl,
      commands: {
        curl: curlCommand,
        wget: wgetCommand,
        docker: `docker run -d --name panel-agent -e PANEL_URL=${panelUrl} -e NODE_TOKEN=${token} --network host panel-agent:latest`,
      },
      copyText: curlCommand,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Auto-register new node (called by install script)' })
  async registerNode(
    @Body() body: { name: string; publicIp: string; arch: string; os: string },
    @Req() req: any,
  ) {
    // Get tenant from API key prefix or default tenant
    const apiKeyHeader = req.headers['x-api-key'] as string;
    let tenantId: string;

    if (apiKeyHeader) {
      // API key format: prefix_secret, we only store hash
      const keyPrefix = apiKeyHeader.split('_')[0];
      const key = await this.prisma.tenantApiKey.findFirst({
        where: { keyPrefix },
      });
      if (!key) throw new Error('Invalid API key');
      tenantId = key.tenantId;
    } else {
      // Use default tenant for public registration
      const tenant = await this.prisma.tenant.findFirst({
        where: { slug: 'default' },
      });
      if (!tenant) throw new Error('No default tenant');
      tenantId = tenant.id;
    }

    const token = randomBytes(32).toString('hex');
    const node = await this.prisma.node.create({
      data: {
        tenantId,
        name: body.name,
        token,
        publicIp: body.publicIp,
        nodeType: 'standard',
        status: 'pending',
        systemInfo: { arch: body.arch, os: body.os },
      },
    });

    return { id: node.id, token: node.token, name: node.name };
  }

  private getEmbeddedScript(): string {
    return `#!/bin/bash
# Panel Agent Installation Script
# Usage: curl -fsSL https://panel.example.com/api/install/script | bash -s -- --token=xxx --panel=https://panel.example.com

set -e
RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; NC='\\033[0m'

INSTALL_DIR="/opt/panel-agent"
CONFIG_DIR="/etc/panel-agent"
LOG_DIR="/var/log/panel-agent"
XRAY_DIR="/usr/local/share/xray"

while [[ $# -gt 0 ]]; do
  case $1 in
    --token=*) NODE_TOKEN="\${1#*=}"; shift ;;
    --panel=*) PANEL_URL="\${1#*=}"; shift ;;
    --uninstall) UNINSTALL=true; shift ;;
    *) shift ;;
  esac
done

log_info() { echo -e "\${GREEN}[OK]\${NC} $1"; }
log_error() { echo -e "\${RED}[ERROR]\${NC} $1"; }

if [ "$UNINSTALL" = "true" ]; then
  systemctl stop panel-agent xray 2>/dev/null || true
  systemctl disable panel-agent xray 2>/dev/null || true
  rm -rf "$INSTALL_DIR" "$CONFIG_DIR" "$LOG_DIR" /etc/systemd/system/panel-agent.service /etc/systemd/system/xray.service
  systemctl daemon-reload
  log_info "Uninstalled"
  exit 0
fi

[ -z "$NODE_TOKEN" ] || [ -z "$PANEL_URL" ] && { log_error "--token and --panel required"; exit 1; }
[ "$EUID" -ne 0 ] && { log_error "Run as root"; exit 1; }

ARCH=$(uname -m); case $ARCH in x86_64) ARCH="amd64";; aarch64) ARCH="arm64";; esac

# Install Xray
log_info "Installing Xray..."
XRAY_VER=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep tag_name | cut -d'"' -f4)
mkdir -p /tmp/xray "$XRAY_DIR"
curl -sL "https://github.com/XTLS/Xray-core/releases/download/\${XRAY_VER}/Xray-linux-\${ARCH}.zip" -o /tmp/xray/xray.zip
unzip -oq /tmp/xray/xray.zip -d /tmp/xray && mv /tmp/xray/xray /usr/local/bin/ && chmod +x /usr/local/bin/xray
curl -sL "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat" -o "$XRAY_DIR/geoip.dat"
curl -sL "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat" -o "$XRAY_DIR/geosite.dat"
rm -rf /tmp/xray

# Install Agent
log_info "Installing Agent..."
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$LOG_DIR"
curl -sL "\${PANEL_URL}/downloads/agent-linux-\${ARCH}" -o "$INSTALL_DIR/agent" && chmod +x "$INSTALL_DIR/agent"

# Config
cat > "$CONFIG_DIR/config.yaml" << EOF
panel:
  url: \${PANEL_URL}
  token: \${NODE_TOKEN}
xray:
  binary: /usr/local/bin/xray
  config_path: \${CONFIG_DIR}/xray.json
  asset_path: \${XRAY_DIR}
intervals:
  config_poll: 30s
  user_poll: 30s
  traffic_report: 10s
  status_report: 10s
log:
  level: info
  path: \${LOG_DIR}/agent.log
EOF
echo '{}' > "$CONFIG_DIR/xray.json"

# Services
cat > /etc/systemd/system/xray.service << EOF
[Unit]
Description=Xray Service
After=network.target
[Service]
Type=simple
ExecStart=/usr/local/bin/xray run -config \${CONFIG_DIR}/xray.json
Restart=on-failure
LimitNOFILE=1000000
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/panel-agent.service << EOF
[Unit]
Description=Panel Agent
After=network.target xray.service
[Service]
Type=simple
ExecStart=\${INSTALL_DIR}/agent -config \${CONFIG_DIR}/config.yaml
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xray panel-agent
systemctl start xray panel-agent

log_info "Installation complete!"
echo "Commands: systemctl status panel-agent | journalctl -u panel-agent -f"
`;
  }
}
