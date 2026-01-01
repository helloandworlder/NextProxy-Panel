package xray

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/pkg/types"
)

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
	AlterID       int
	Security      string
	Method        string
	Level         int
	UploadLimit   int64
	DownloadLimit int64
}

// Adapter implements CoreAdapter for Xray
type Adapter struct {
	process    *ProcessManager
	grpcClient *GRPCClient
	configPath string
	mu         sync.RWMutex
	
	// Cached inbound tags for user management
	inboundTags []string
}

// NewAdapter creates a new Xray adapter
func NewAdapter(binaryPath, configPath, assetPath, grpcAddr string) *Adapter {
	return &Adapter{
		process:    NewProcessManager(binaryPath, configPath, assetPath),
		grpcClient: NewGRPCClient(grpcAddr),
		configPath: configPath,
	}
}

// GetType returns the core type
func (a *Adapter) GetType() string {
	return "xray"
}

// Start starts Xray with the given config
func (a *Adapter) Start(config []byte) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Write config to file
	if err := os.WriteFile(a.configPath, config, 0644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	// Extract inbound tags from config
	a.extractInboundTags(config)

	// Start process
	ctx := context.Background()
	if err := a.process.Start(ctx); err != nil {
		return fmt.Errorf("start xray: %w", err)
	}

	// Wait for gRPC API to be ready
	time.Sleep(2 * time.Second)
	return nil
}

// Stop stops Xray
func (a *Adapter) Stop() error {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.process.Stop()
}

// Restart restarts Xray with new config
func (a *Adapter) Restart(config []byte) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Write new config
	if err := os.WriteFile(a.configPath, config, 0644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	// Extract inbound tags
	a.extractInboundTags(config)

	// Restart process
	ctx := context.Background()
	return a.process.Restart(ctx)
}

// QueryStats queries traffic statistics
func (a *Adapter) QueryStats() (*StatsResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reports, err := a.grpcClient.QueryTrafficStats(ctx, true)
	if err != nil {
		return nil, err
	}

	result := &StatsResult{
		Users: make([]UserStats, 0, len(reports)),
	}

	for _, r := range reports {
		result.Users = append(result.Users, UserStats{
			Email:    r.Email,
			Upload:   r.Upload,
			Download: r.Download,
		})
	}

	return result, nil
}

// AddUser adds a user dynamically
func (a *Adapter) AddUser(user UserConfig) error {
	a.mu.RLock()
	tags := a.inboundTags
	a.mu.RUnlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userConfig := &types.UserConfig{
		Email:    user.Email,
		UUID:     user.UUID,
		Password: user.Password,
		Flow:     user.Flow,
		AlterID:  user.AlterID,
		Security: user.Security,
		Method:   user.Method,
		Level:    user.Level,
	}

	// Add to all inbounds
	for _, tag := range tags {
		if err := a.grpcClient.AddUser(ctx, tag, userConfig); err != nil {
			log.Warn().Err(err).Str("tag", tag).Str("email", user.Email).Msg("Failed to add user to inbound")
		}
	}

	// Set rate limit if specified
	if user.UploadLimit > 0 || user.DownloadLimit > 0 {
		a.grpcClient.SetUserRateLimit(ctx, user.Email, user.UploadLimit, user.DownloadLimit)
	}

	return nil
}

// RemoveUser removes a user dynamically
func (a *Adapter) RemoveUser(email string) error {
	a.mu.RLock()
	tags := a.inboundTags
	a.mu.RUnlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return a.grpcClient.RemoveUserFromAllInbounds(ctx, email, tags)
}

// IsRunning returns whether Xray is running
func (a *Adapter) IsRunning() bool {
	return a.process.IsRunning()
}

// extractInboundTags extracts inbound tags from config
func (a *Adapter) extractInboundTags(config []byte) {
	var cfg struct {
		Inbounds []struct {
			Tag string `json:"tag"`
		} `json:"inbounds"`
	}
	if err := json.Unmarshal(config, &cfg); err != nil {
		return
	}

	tags := make([]string, 0)
	for _, ib := range cfg.Inbounds {
		if ib.Tag != "" && ib.Tag != "api" {
			tags = append(tags, ib.Tag)
		}
	}
	a.inboundTags = tags
}

// GetGRPCClient returns the gRPC client for advanced operations
func (a *Adapter) GetGRPCClient() *GRPCClient {
	return a.grpcClient
}
