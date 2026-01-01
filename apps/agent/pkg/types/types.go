package types

// CoreType represents the proxy core type (unified with Panel)
type CoreType string

const (
	CoreTypeXray    CoreType = "xray"
	CoreTypeSingbox CoreType = "singbox"
)

// IsValid checks if the core type is valid
func (c CoreType) IsValid() bool {
	return c == CoreTypeXray || c == CoreTypeSingbox
}

// String returns the string representation
func (c CoreType) String() string {
	return string(c)
}

// ParseCoreType parses a string to CoreType
func ParseCoreType(s string) CoreType {
	switch s {
	case "xray", "xray-core":
		return CoreTypeXray
	case "singbox", "sing-box":
		return CoreTypeSingbox
	default:
		return CoreTypeXray // default to xray
	}
}

// NodeConfig represents the configuration pulled from Panel
type NodeConfig struct {
	Version   string           `json:"version"`
	ETag      string           `json:"etag"`
	Inbounds  []InboundConfig  `json:"inbounds"`
	Outbounds []OutboundConfig `json:"outbounds"`
	Routing   *RoutingConfig   `json:"routing"`
	DNS       interface{}      `json:"dns"`
	Policy    interface{}      `json:"policy"`
}

// InboundConfig represents Xray inbound configuration
type InboundConfig struct {
	Tag            string      `json:"tag"`
	Protocol       string      `json:"protocol"`
	Port           int         `json:"port"`
	Listen         string      `json:"listen"`
	Settings       interface{} `json:"settings"`
	StreamSettings interface{} `json:"streamSettings,omitempty"`
	Sniffing       interface{} `json:"sniffing,omitempty"`
	Allocate       interface{} `json:"allocate,omitempty"`
}

// OutboundConfig represents Xray outbound configuration
type OutboundConfig struct {
	Tag            string      `json:"tag"`
	Protocol       string      `json:"protocol"`
	SendThrough    string      `json:"sendThrough,omitempty"`
	Settings       interface{} `json:"settings"`
	StreamSettings interface{} `json:"streamSettings,omitempty"`
	ProxySettings  interface{} `json:"proxySettings,omitempty"`
	Mux            interface{} `json:"mux,omitempty"`
}

// RoutingConfig represents Xray routing configuration
type RoutingConfig struct {
	DomainStrategy string        `json:"domainStrategy"`
	Rules          []interface{} `json:"rules"`
	Balancers      []interface{} `json:"balancers,omitempty"`
}

// UserListResponse represents the user list from Panel
type UserListResponse struct {
	Version    string            `json:"version"`
	ETag       string            `json:"etag"`
	Users      []UserConfig      `json:"users"`
	RateLimits []RateLimitConfig `json:"rateLimits"`
}

// UserConfig represents a user configuration
type UserConfig struct {
	Email         string   `json:"email"`
	UUID          string   `json:"uuid,omitempty"`
	Password      string   `json:"password,omitempty"`
	Flow          string   `json:"flow,omitempty"`
	AlterID       int      `json:"alterId,omitempty"`
	Security      string   `json:"security,omitempty"`
	Method        string   `json:"method,omitempty"`
	Level         int      `json:"level"`
	InboundTags   []string `json:"inboundTags"`
	OutboundTag   string   `json:"outboundTag,omitempty"`
	TotalBytes    int64    `json:"totalBytes"`
	UsedBytes     int64    `json:"usedBytes"`
	ExpiryTime    int64    `json:"expiryTime"`
	UploadLimit   int64    `json:"uploadLimit"`
	DownloadLimit int64    `json:"downloadLimit"`
	DeviceLimit   int      `json:"deviceLimit"`
}

// TrafficReport represents traffic data to report
type TrafficReport struct {
	Email    string `json:"email"`
	Upload   int64  `json:"upload"`
	Download int64  `json:"download"`
}

// StatusReport represents node status to report
type StatusReport struct {
	CPUUsage    float64 `json:"cpuUsage"`
	MemoryUsage float64 `json:"memoryUsage"`
	DiskUsage   float64 `json:"diskUsage"`
	Uptime      int64   `json:"uptime"`
	OnlineUsers int     `json:"onlineUsers"`
	XrayVersion string  `json:"xrayVersion,omitempty"`
}

// AliveUser represents an online user
type AliveUser struct {
	Email    string `json:"email"`
	IP       string `json:"ip"`
	DeviceID string `json:"deviceId,omitempty"`
}

// AliveResponse represents the response from alive endpoint
type AliveResponse struct {
	Success   bool     `json:"success"`
	KickUsers []string `json:"kickUsers"`
}

// RateLimitConfig represents rate limit configuration for a user
type RateLimitConfig struct {
	Email              string `json:"email"`
	UploadBytesPerSec  int64  `json:"uploadBytesPerSec"`
	DownloadBytesPerSec int64 `json:"downloadBytesPerSec"`
}

// EgressIP represents an egress IP to report
type EgressIP struct {
	IP            string `json:"ip"`
	Version       int    `json:"version"`
	InterfaceName string `json:"interfaceName,omitempty"`
	IPType        string `json:"ipType,omitempty"`
	ISP           string `json:"isp,omitempty"`
	ASN           string `json:"asn,omitempty"`
	IsActive      bool   `json:"isActive"`
}

// RegisterRequest represents node registration request
type RegisterRequest struct {
	Hostname     string            `json:"hostname"`
	OS           string            `json:"os"`
	Arch         string            `json:"arch"`
	PublicIP     string            `json:"publicIp"`
	XrayVersion  string            `json:"xrayVersion"`
	Capabilities *CoreCapabilities `json:"capabilities,omitempty"`
}

// CoreCapabilities represents the proxy core capabilities
type CoreCapabilities struct {
	CoreType   CoreType  `json:"coreType"`   // xray, singbox
	Version    string    `json:"version"`
	Protocols  Protocols `json:"protocols"`
	Transports []string  `json:"transports"`
	Features   []string  `json:"features"`
}

// Protocols represents supported protocols
type Protocols struct {
	Inbound  []string `json:"inbound"`
	Outbound []string `json:"outbound"`
}

// RegisterResponse represents node registration response
type RegisterResponse struct {
	NodeID                string `json:"nodeId"`
	NodeName              string `json:"nodeName"`
	ConfigPollInterval    int    `json:"configPollInterval"`
	UserPollInterval      int    `json:"userPollInterval"`
	TrafficReportInterval int    `json:"trafficReportInterval"`
	StatusReportInterval  int    `json:"statusReportInterval"`
	AlivePollInterval     int    `json:"alivePollInterval"`
}
