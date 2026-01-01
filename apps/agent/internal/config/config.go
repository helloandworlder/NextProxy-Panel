package config

import (
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config represents the agent configuration
type Config struct {
	Panel    PanelConfig    `mapstructure:"panel"`
	Xray     XrayConfig     `mapstructure:"xray"`
	Interval IntervalConfig `mapstructure:"interval"`
	HTTP     HTTPConfig     `mapstructure:"http"`
	Log      LogConfig      `mapstructure:"log"`
}

// PanelConfig represents Panel API connection settings
type PanelConfig struct {
	URL       string `mapstructure:"url"`
	Token     string `mapstructure:"token"`
	APIPrefix string `mapstructure:"api_prefix"`
}

// XrayConfig represents Xray paths and settings
type XrayConfig struct {
	BinaryPath string `mapstructure:"binary_path"`
	ConfigPath string `mapstructure:"config_path"`
	AssetPath  string `mapstructure:"asset_path"`
	APIAddress string `mapstructure:"api_address"`
}

// IntervalConfig represents polling/reporting intervals
type IntervalConfig struct {
	ConfigPoll    time.Duration `mapstructure:"config_poll"`
	UserPoll      time.Duration `mapstructure:"user_poll"`
	TrafficReport time.Duration `mapstructure:"traffic_report"`
	StatusReport  time.Duration `mapstructure:"status_report"`
	AlivePoll     time.Duration `mapstructure:"alive_poll"`
}

// HTTPConfig represents HTTP client settings
type HTTPConfig struct {
	Timeout    time.Duration `mapstructure:"timeout"`
	RetryCount int           `mapstructure:"retry_count"`
}

// LogConfig represents logging settings
type LogConfig struct {
	Level string `mapstructure:"level"`
	File  string `mapstructure:"file"`
}

// Load loads configuration from file and environment variables
func Load(configPath string) (*Config, error) {
	v := viper.New()

	// Set defaults
	setDefaults(v)

	// Config file settings
	if configPath != "" {
		v.SetConfigFile(configPath)
	} else {
		v.SetConfigName("config")
		v.SetConfigType("yaml")
		v.AddConfigPath("/etc/panel-agent")
		v.AddConfigPath(".")
	}

	// Environment variable settings
	v.SetEnvPrefix("PANEL_AGENT")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Bind specific env vars for backward compatibility
	bindEnvVars(v)

	// Read config file (ignore if not found)
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	// Panel defaults
	v.SetDefault("panel.url", "http://localhost:3001")
	v.SetDefault("panel.token", "")
	v.SetDefault("panel.api_prefix", "/api")

	// Xray defaults
	v.SetDefault("xray.binary_path", "/usr/local/bin/xray")
	v.SetDefault("xray.config_path", "/etc/xray/config.json")
	v.SetDefault("xray.asset_path", "/usr/local/share/xray")
	v.SetDefault("xray.api_address", "127.0.0.1:10085")

	// Interval defaults
	v.SetDefault("interval.config_poll", "30s")
	v.SetDefault("interval.user_poll", "30s")
	v.SetDefault("interval.traffic_report", "10s")
	v.SetDefault("interval.status_report", "10s")
	v.SetDefault("interval.alive_poll", "60s")

	// HTTP defaults
	v.SetDefault("http.timeout", "30s")
	v.SetDefault("http.retry_count", 3)

	// Log defaults
	v.SetDefault("log.level", "info")
	v.SetDefault("log.file", "")
}

func bindEnvVars(v *viper.Viper) {
	// Backward compatible env vars
	v.BindEnv("panel.url", "PANEL_URL")
	v.BindEnv("panel.token", "NODE_TOKEN")
	v.BindEnv("xray.binary_path", "XRAY_BINARY_PATH")
	v.BindEnv("xray.config_path", "XRAY_CONFIG_PATH")
	v.BindEnv("xray.asset_path", "XRAY_ASSET_PATH")
	v.BindEnv("xray.api_address", "XRAY_API_ADDRESS")
	v.BindEnv("log.level", "LOG_LEVEL")
}

// NewConfig is a Wire provider for Config
func NewConfig(configPath string) (*Config, error) {
	return Load(configPath)
}
