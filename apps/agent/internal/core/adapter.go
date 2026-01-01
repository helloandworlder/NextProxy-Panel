package core

// StatsResult contains traffic statistics from the core
type StatsResult struct {
	Users     []UserStats
	Inbounds  []InboundStats
	Outbounds []OutboundStats
}

type UserStats struct {
	Email        string
	Upload       int64
	Download     int64
	UploadRate   int64
	DownloadRate int64
}

type InboundStats struct {
	Tag      string
	Upload   int64
	Download int64
}

type OutboundStats struct {
	Tag      string
	Upload   int64
	Download int64
}

// UserConfig represents a user configuration for the core
type UserConfig struct {
	Email         string
	UUID          string
	Password      string
	Flow          string
	Method        string
	Level         int
	UploadLimit   int64
	DownloadLimit int64
}

// CoreAdapter is the interface for proxy core implementations
type CoreAdapter interface {
	// Start starts the core with the given config
	Start(config []byte) error
	
	// Stop stops the core
	Stop() error
	
	// Restart restarts the core with new config
	Restart(config []byte) error
	
	// QueryStats queries traffic statistics
	QueryStats() (*StatsResult, error)
	
	// AddUser adds a user dynamically
	AddUser(user UserConfig) error
	
	// RemoveUser removes a user dynamically
	RemoveUser(email string) error
	
	// IsRunning returns whether the core is running
	IsRunning() bool
	
	// GetType returns the core type (xray/singbox)
	GetType() string
}
