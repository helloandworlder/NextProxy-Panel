package manager

import (
	"context"
	"sync"

	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/internal/client"
	"github.com/synexim/panel-agent/internal/config"
	"github.com/synexim/panel-agent/internal/reporter"
	"github.com/synexim/panel-agent/internal/xray"
	"github.com/synexim/panel-agent/pkg/types"
)

// Manager orchestrates all agent components
type Manager struct {
	cfg       *config.Config
	client    *client.Client
	generator *xray.ConfigGenerator
	process   *xray.ProcessManager
	stats     *reporter.StatsCollector
	grpc      *xray.GRPCClient

	nodeConfig *types.NodeConfig
	users      []types.UserConfig
	rateLimits []types.RateLimitConfig
	userEmails []string // Track current user emails for hot sync
	mu         sync.RWMutex

	stopCh chan struct{}
}

// ManagerParams holds dependencies for Manager (Wire provider params)
type ManagerParams struct {
	Cfg       *config.Config
	Client    *client.Client
	Generator *xray.ConfigGenerator
	Process   *xray.ProcessManager
	Stats     *reporter.StatsCollector
	GRPC      *xray.GRPCClient
}

// New creates a new manager with injected dependencies (Wire provider)
func New(params ManagerParams) *Manager {
	return &Manager{
		cfg:       params.Cfg,
		client:    params.Client,
		generator: params.Generator,
		process:   params.Process,
		stats:     params.Stats,
		grpc:      params.GRPC,
		stopCh:    make(chan struct{}),
	}
}

// Start starts the agent
func (m *Manager) Start(ctx context.Context) error {
	log.Info().Msg("Starting Panel Agent")

	// Register with Panel
	if err := m.register(ctx); err != nil {
		return err
	}

	// Initial config and user sync
	if err := m.syncConfig(ctx); err != nil {
		return err
	}
	if err := m.syncUsers(ctx); err != nil {
		return err
	}

	// Generate and write Xray config
	if err := m.generateAndWriteConfig(); err != nil {
		return err
	}

	// Start Xray
	if err := m.process.Start(ctx); err != nil {
		return err
	}

	// Report egress IPs
	m.reportEgressIPs(ctx)

	// Start background tasks
	go m.configSyncLoop(ctx)
	go m.userSyncLoop(ctx)
	go m.trafficReportLoop(ctx)
	go m.statusReportLoop(ctx)
	go m.aliveReportLoop(ctx)

	log.Info().Msg("Panel Agent started successfully")
	return nil
}
