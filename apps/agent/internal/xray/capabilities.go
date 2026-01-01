package xray

import (
	"os/exec"
	"regexp"
	"strings"

	"github.com/synexim/panel-agent/pkg/types"
)

// DetectCapabilities detects Xray core capabilities
func DetectCapabilities(binaryPath string) *types.CoreCapabilities {
	version := detectVersion(binaryPath)
	
	return &types.CoreCapabilities{
		CoreType:   "xray",
		Version:    version,
		Protocols:  getXrayProtocols(),
		Transports: getXrayTransports(),
		Features:   getXrayFeatures(version),
	}
}

// detectVersion runs xray version command and parses output
func detectVersion(binaryPath string) string {
	cmd := exec.Command(binaryPath, "version")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	
	// Parse version from output like "Xray 1.8.4 (Xray, Penetrates Everything.)"
	re := regexp.MustCompile(`Xray\s+(\d+\.\d+\.\d+)`)
	matches := re.FindStringSubmatch(string(output))
	if len(matches) > 1 {
		return matches[1]
	}
	return "unknown"
}

// getXrayProtocols returns supported protocols for Xray
func getXrayProtocols() types.Protocols {
	return types.Protocols{
		Inbound: []string{
			"vless",
			"vmess",
			"trojan",
			"shadowsocks",
			"socks",
			"http",
			"dokodemo-door",
		},
		Outbound: []string{
			"freedom",
			"blackhole",
			"dns",
			"vless",
			"vmess",
			"trojan",
			"shadowsocks",
			"socks",
			"http",
			"wireguard",
			"loopback",
		},
	}
}

// getXrayTransports returns supported transports for Xray
func getXrayTransports() []string {
	return []string{
		"tcp",
		"ws",
		"grpc",
		"h2",
		"quic",
		"kcp",
		"httpupgrade",
	}
}

// getXrayFeatures returns supported features based on version
func getXrayFeatures(version string) []string {
	features := []string{
		"sniffing",
		"fallback",
		"mux",
		"stats",
	}
	
	// Version-specific features
	if compareVersion(version, "1.4.0") >= 0 {
		features = append(features, "xtls-vision")
	}
	if compareVersion(version, "1.8.0") >= 0 {
		features = append(features, "reality")
	}
	if compareVersion(version, "1.8.3") >= 0 {
		features = append(features, "fragment")
	}
	
	return features
}

// compareVersion compares two version strings
// Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
func compareVersion(v1, v2 string) int {
	if v1 == "unknown" {
		return -1
	}
	
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")
	
	for i := 0; i < 3; i++ {
		var n1, n2 int
		if i < len(parts1) {
			n1 = parseVersionPart(parts1[i])
		}
		if i < len(parts2) {
			n2 = parseVersionPart(parts2[i])
		}
		
		if n1 < n2 {
			return -1
		}
		if n1 > n2 {
			return 1
		}
	}
	return 0
}

func parseVersionPart(s string) int {
	var n int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		} else {
			break
		}
	}
	return n
}
