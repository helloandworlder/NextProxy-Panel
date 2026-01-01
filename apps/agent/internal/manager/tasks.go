package manager

import (
	"context"
	"net"
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/pkg/types"
)

// Stop stops the agent
func (m *Manager) Stop() {
	log.Info().Msg("Stopping Panel Agent")
	close(m.stopCh)
	m.process.Stop()
}

// register registers the node with Panel
func (m *Manager) register(ctx context.Context) error {
	hostname, _ := os.Hostname()
	
	req := &types.RegisterRequest{
		Hostname:    hostname,
		OS:          runtime.GOOS,
		Arch:        runtime.GOARCH,
		PublicIP:    m.getPublicIP(),
		XrayVersion: m.process.GetVersion(),
	}

	resp, err := m.client.Register(ctx, req)
	if err != nil {
		return err
	}

	log.Info().
		Str("nodeId", resp.NodeID).
		Str("nodeName", resp.NodeName).
		Str("xrayVersion", req.XrayVersion).
		Msg("Registered with Panel")

	// Update intervals from server response (convert to duration)
	if resp.ConfigPollInterval > 0 {
		m.cfg.Interval.ConfigPoll = time.Duration(resp.ConfigPollInterval) * time.Second
	}
	if resp.UserPollInterval > 0 {
		m.cfg.Interval.UserPoll = time.Duration(resp.UserPollInterval) * time.Second
	}
	if resp.TrafficReportInterval > 0 {
		m.cfg.Interval.TrafficReport = time.Duration(resp.TrafficReportInterval) * time.Second
	}
	if resp.StatusReportInterval > 0 {
		m.cfg.Interval.StatusReport = time.Duration(resp.StatusReportInterval) * time.Second
	}
	if resp.AlivePollInterval > 0 {
		m.cfg.Interval.AlivePoll = time.Duration(resp.AlivePollInterval) * time.Second
	}

	return nil
}

// syncConfig syncs configuration from Panel
func (m *Manager) syncConfig(ctx context.Context) error {
	config, changed, err := m.client.GetConfig(ctx)
	if err != nil {
		return err
	}
	if !changed {
		return nil
	}

	m.mu.Lock()
	m.nodeConfig = config
	m.mu.Unlock()

	log.Info().Str("version", config.Version).Msg("Config synced from Panel")
	return nil
}

// syncUsers syncs users from Panel
func (m *Manager) syncUsers(ctx context.Context) error {
	resp, changed, err := m.client.GetUsers(ctx)
	if err != nil {
		return err
	}
	if !changed {
		return nil
	}

	m.mu.Lock()
	m.users = resp.Users
	m.rateLimits = resp.RateLimits
	m.mu.Unlock()

	log.Info().Int("count", len(resp.Users)).Int("rateLimits", len(resp.RateLimits)).Msg("Users synced from Panel")
	return nil
}

// generateAndWriteConfig generates Xray config and writes to file
func (m *Manager) generateAndWriteConfig() error {
	m.mu.RLock()
	nodeConfig := m.nodeConfig
	users := m.users
	m.mu.RUnlock()

	if nodeConfig == nil {
		return nil
	}

	config, err := m.generator.Generate(nodeConfig, users)
	if err != nil {
		return err
	}

	return m.generator.WriteConfig(config)
}

// getPublicIP gets the public IP address
func (m *Manager) getPublicIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return ""
}

// reportEgressIPs reports egress IPs to Panel
func (m *Manager) reportEgressIPs(ctx context.Context) {
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get network interfaces")
		return
	}

	var ips []types.EgressIP
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipnet, ok := addr.(*net.IPNet)
			if !ok || ipnet.IP.IsLoopback() {
				continue
			}
			version := 4
			if strings.Contains(ipnet.IP.String(), ":") {
				version = 6
			}
			ips = append(ips, types.EgressIP{
				IP:            ipnet.IP.String(),
				Version:       version,
				InterfaceName: iface.Name,
				IPType:        "datacenter",
				IsActive:      true,
			})
		}
	}

	if len(ips) > 0 {
		if err := m.client.ReportEgressIPs(ctx, ips); err != nil {
			log.Error().Err(err).Msg("Failed to report egress IPs")
		} else {
			log.Info().Int("count", len(ips)).Msg("Reported egress IPs")
		}
	}
}
