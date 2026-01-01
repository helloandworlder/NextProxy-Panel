package xray

import (
	"encoding/json"
	"os"

	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/pkg/types"
)

// buildInboundsWithClients injects clients into inbound configurations
func (g *ConfigGenerator) buildInboundsWithClients(inbounds []types.InboundConfig, users []types.UserConfig) []interface{} {
	// Group users by inbound tag
	usersByInbound := make(map[string][]types.UserConfig)
	for _, user := range users {
		for _, tag := range user.InboundTags {
			usersByInbound[tag] = append(usersByInbound[tag], user)
		}
	}

	log.Debug().Int("totalUsers", len(users)).Int("totalInbounds", len(inbounds)).Msg("Building inbounds with clients")

	result := make([]interface{}, 0, len(inbounds))
	for _, inbound := range inbounds {
		inboundUsers := usersByInbound[inbound.Tag]
		
		log.Debug().Str("tag", inbound.Tag).Str("protocol", inbound.Protocol).Int("users", len(inboundUsers)).Msg("Processing inbound")

		// Clone settings and inject clients
		settings := g.cloneSettings(inbound.Settings)
		if settings == nil {
			settings = make(map[string]interface{})
		}

		// Socks5 uses "accounts" instead of "clients"
		if inbound.Protocol == "socks" {
			accounts := g.buildSocksAccounts(inboundUsers)
			settings["accounts"] = accounts
			// Also remove clients array for socks (not needed)
			delete(settings, "clients")
			log.Debug().Int("accountsCount", len(accounts)).Msg("Built socks accounts")
		} else {
			clients := g.buildClients(inbound.Protocol, inboundUsers)
			settings["clients"] = clients
		}

		inboundConfig := map[string]interface{}{
			"tag":      inbound.Tag,
			"protocol": inbound.Protocol,
			"port":     inbound.Port,
			"listen":   inbound.Listen,
			"settings": settings,
		}

		if inbound.StreamSettings != nil {
			inboundConfig["streamSettings"] = inbound.StreamSettings
		}
		if inbound.Sniffing != nil {
			inboundConfig["sniffing"] = inbound.Sniffing
		}
		if inbound.Allocate != nil {
			inboundConfig["allocate"] = inbound.Allocate
		}

		result = append(result, inboundConfig)
	}

	return result
}

// buildSocksAccounts builds accounts list for Socks5 protocol
func (g *ConfigGenerator) buildSocksAccounts(users []types.UserConfig) []map[string]interface{} {
	accounts := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		account := map[string]interface{}{
			"user": user.Email,
			"pass": user.Password,
		}
		accounts = append(accounts, account)
	}
	return accounts
}

// buildClients builds client list for specific protocol
func (g *ConfigGenerator) buildClients(protocol string, users []types.UserConfig) []map[string]interface{} {
	clients := make([]map[string]interface{}, 0, len(users))

	for _, user := range users {
		client := make(map[string]interface{})
		client["email"] = user.Email
		client["level"] = user.Level

		switch protocol {
		case "vless":
			client["id"] = user.UUID
			if user.Flow != "" {
				client["flow"] = user.Flow
			}
		case "vmess":
			client["id"] = user.UUID
			client["alterId"] = user.AlterID
			if user.Security != "" {
				client["security"] = user.Security
			}
		case "trojan":
			client["password"] = user.Password
		case "shadowsocks":
			client["password"] = user.Password
			if user.Method != "" {
				client["method"] = user.Method
			}
		}

		clients = append(clients, client)
	}

	return clients
}

// cloneSettings clones settings map
func (g *ConfigGenerator) cloneSettings(settings interface{}) map[string]interface{} {
	if settings == nil {
		return nil
	}

	data, err := json.Marshal(settings)
	if err != nil {
		return nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil
	}

	return result
}

// WriteConfig writes configuration to file
func (g *ConfigGenerator) WriteConfig(config *XrayConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(g.configPath, data, 0644)
}
