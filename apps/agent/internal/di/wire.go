//go:build wireinject
// +build wireinject

package di

import (
	"github.com/google/wire"
	"github.com/synexim/panel-agent/internal/client"
	"github.com/synexim/panel-agent/internal/config"
	"github.com/synexim/panel-agent/internal/manager"
	"github.com/synexim/panel-agent/internal/reporter"
	"github.com/synexim/panel-agent/internal/xray"
)

// ProvideConfig provides Config from config path
func ProvideConfig(configPath string) (*config.Config, error) {
	return config.Load(configPath)
}

// ProvideClient provides Panel API Client
func ProvideClient(cfg *config.Config) *client.Client {
	return client.New(cfg)
}

// ProvideConfigGenerator provides Xray ConfigGenerator
func ProvideConfigGenerator(cfg *config.Config) *xray.ConfigGenerator {
	return xray.NewConfigGenerator(cfg.Xray.ConfigPath)
}

// ProvideProcessManager provides Xray ProcessManager
func ProvideProcessManager(cfg *config.Config) *xray.ProcessManager {
	return xray.NewProcessManager(cfg.Xray.BinaryPath, cfg.Xray.ConfigPath, cfg.Xray.AssetPath)
}

// ProvideStatsCollector provides StatsCollector
func ProvideStatsCollector(cfg *config.Config) *reporter.StatsCollector {
	return reporter.NewStatsCollector(cfg.Xray.APIAddress)
}

// ProvideGRPCClient provides Xray GRPCClient
func ProvideGRPCClient(cfg *config.Config) *xray.GRPCClient {
	return xray.NewGRPCClient(cfg.Xray.APIAddress)
}

// ProvideManagerParams provides ManagerParams for Manager
func ProvideManagerParams(
	cfg *config.Config,
	client *client.Client,
	generator *xray.ConfigGenerator,
	process *xray.ProcessManager,
	stats *reporter.StatsCollector,
	grpc *xray.GRPCClient,
) manager.ManagerParams {
	return manager.ManagerParams{
		Cfg:       cfg,
		Client:    client,
		Generator: generator,
		Process:   process,
		Stats:     stats,
		GRPC:      grpc,
	}
}

// ProvideManager provides Manager
func ProvideManager(params manager.ManagerParams) *manager.Manager {
	return manager.New(params)
}

// ProviderSet is the Wire provider set for all dependencies
var ProviderSet = wire.NewSet(
	ProvideConfig,
	ProvideClient,
	ProvideConfigGenerator,
	ProvideProcessManager,
	ProvideStatsCollector,
	ProvideGRPCClient,
	ProvideManagerParams,
	ProvideManager,
)

// InitializeManager creates a Manager with all dependencies injected
func InitializeManager(configPath string) (*manager.Manager, error) {
	wire.Build(ProviderSet)
	return nil, nil
}
