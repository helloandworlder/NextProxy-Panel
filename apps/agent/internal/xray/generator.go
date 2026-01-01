package xray

import (
	"github.com/synexim/panel-agent/pkg/types"
)

// ConfigGenerator generates Xray configuration
type ConfigGenerator struct {
	configPath string
}

// NewConfigGenerator creates a new config generator
func NewConfigGenerator(configPath string) *ConfigGenerator {
	return &ConfigGenerator{configPath: configPath}
}

// XrayConfig represents the full Xray configuration
type XrayConfig struct {
	Log       *LogConfig           `json:"log,omitempty"`
	API       *APIConfig           `json:"api,omitempty"`
	Stats     *StatsConfig         `json:"stats,omitempty"`
	Policy    interface{}          `json:"policy,omitempty"`
	DNS       interface{}          `json:"dns,omitempty"`
	Inbounds  []interface{}        `json:"inbounds"`
	Outbounds []types.OutboundConfig `json:"outbounds"`
	Routing   *types.RoutingConfig `json:"routing,omitempty"`
}

// LogConfig represents Xray log configuration
type LogConfig struct {
	Loglevel string `json:"loglevel"`
	Access   string `json:"access,omitempty"`
	Error    string `json:"error,omitempty"`
}

// APIConfig represents Xray API configuration
type APIConfig struct {
	Tag      string   `json:"tag"`
	Services []string `json:"services"`
}

// StatsConfig represents Xray stats configuration
type StatsConfig struct{}

// Generate generates Xray configuration from Panel config and users
func (g *ConfigGenerator) Generate(nodeConfig *types.NodeConfig, users []types.UserConfig) (*XrayConfig, error) {
	// Build default policy with stats enabled if not provided
	policy := nodeConfig.Policy
	if policy == nil {
		policy = map[string]interface{}{
			"levels": map[string]interface{}{
				"0": map[string]interface{}{
					"statsUserUplink":   true,
					"statsUserDownlink": true,
					"statsUserOnline":   true,
				},
			},
			"system": map[string]interface{}{
				"statsInboundUplink":    true,
				"statsInboundDownlink":  true,
				"statsOutboundUplink":   true,
				"statsOutboundDownlink": true,
			},
		}
	}

	config := &XrayConfig{
		Log: &LogConfig{Loglevel: "warning"},
		API: &APIConfig{
			Tag:      "api",
			Services: []string{"HandlerService", "StatsService"},
		},
		Stats:     &StatsConfig{},
		Policy:    policy,
		DNS:       nodeConfig.DNS,
		Outbounds: nodeConfig.Outbounds,
		Routing:   nodeConfig.Routing,
	}

	// Build inbounds with injected clients
	inbounds := g.buildInboundsWithClients(nodeConfig.Inbounds, users)
	
	// Add API inbound for stats
	apiInbound := map[string]interface{}{
		"tag":      "api-inbound",
		"listen":   "127.0.0.1",
		"port":     10085,
		"protocol": "dokodemo-door",
		"settings": map[string]interface{}{
			"address": "127.0.0.1",
		},
	}
	config.Inbounds = append([]interface{}{apiInbound}, inbounds...)

	// Add API routing rule
	if config.Routing == nil {
		config.Routing = &types.RoutingConfig{DomainStrategy: "AsIs"}
	}
	apiRule := map[string]interface{}{
		"type":        "field",
		"inboundTag":  []string{"api-inbound"},
		"outboundTag": "api",
	}
	
	// Filter out invalid routing rules (must have outboundTag or balancerTag)
	validRules := []interface{}{apiRule}
	for _, rule := range config.Routing.Rules {
		if ruleMap, ok := rule.(map[string]interface{}); ok {
			if _, hasOutbound := ruleMap["outboundTag"]; hasOutbound {
				validRules = append(validRules, rule)
			} else if _, hasBalancer := ruleMap["balancerTag"]; hasBalancer {
				validRules = append(validRules, rule)
			}
			// Skip rules without outboundTag or balancerTag
		}
	}
	config.Routing.Rules = validRules
	
	// Ensure there's a default outbound (direct) if not present
	hasDirectOutbound := false
	for _, ob := range config.Outbounds {
		if ob.Tag == "direct" {
			hasDirectOutbound = true
			break
		}
	}
	if !hasDirectOutbound {
		config.Outbounds = append(config.Outbounds, types.OutboundConfig{
			Tag:      "direct",
			Protocol: "freedom",
			Settings: map[string]interface{}{},
		})
	}

	// Add API outbound
	apiOutbound := types.OutboundConfig{
		Tag:      "api",
		Protocol: "blackhole",
		Settings: map[string]interface{}{},
	}
	
	// Deduplicate outbounds by tag (keep first occurrence)
	// IMPORTANT: 'direct' must be the FIRST outbound (Xray uses first outbound as default)
	// 'api' outbound is only for API inbound routing, not for default traffic
	seenTags := map[string]bool{}
	
	// First, find and add 'direct' outbound as the first one
	var directOutbound *types.OutboundConfig
	for i := range config.Outbounds {
		if config.Outbounds[i].Tag == "direct" {
			directOutbound = &config.Outbounds[i]
			break
		}
	}
	
	var dedupedOutbounds []types.OutboundConfig
	if directOutbound != nil {
		dedupedOutbounds = append(dedupedOutbounds, *directOutbound)
		seenTags["direct"] = true
	} else {
		// Add default direct outbound if not present
		dedupedOutbounds = append(dedupedOutbounds, types.OutboundConfig{
			Tag:      "direct",
			Protocol: "freedom",
			Settings: map[string]interface{}{},
		})
		seenTags["direct"] = true
	}
	
	// Add api outbound second (for API routing)
	dedupedOutbounds = append(dedupedOutbounds, apiOutbound)
	seenTags["api"] = true
	
	// Then add remaining outbounds
	for _, ob := range config.Outbounds {
		if !seenTags[ob.Tag] {
			seenTags[ob.Tag] = true
			dedupedOutbounds = append(dedupedOutbounds, ob)
		}
	}
	config.Outbounds = dedupedOutbounds

	return config, nil
}
