package xray

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"
)

// ProcessManager manages the Xray process
type ProcessManager struct {
	binaryPath string
	configPath string
	assetPath  string

	cmd     *exec.Cmd
	mu      sync.Mutex
	running bool
}

// NewProcessManager creates a new process manager
func NewProcessManager(binaryPath, configPath, assetPath string) *ProcessManager {
	return &ProcessManager{
		binaryPath: binaryPath,
		configPath: configPath,
		assetPath:  assetPath,
	}
}

// Start starts the Xray process
func (m *ProcessManager) Start(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.running {
		return nil
	}

	m.cmd = exec.CommandContext(ctx, m.binaryPath, "run", "-c", m.configPath)
	m.cmd.Env = append(os.Environ(), fmt.Sprintf("XRAY_LOCATION_ASSET=%s", m.assetPath))
	m.cmd.Stdout = os.Stdout
	m.cmd.Stderr = os.Stderr

	if err := m.cmd.Start(); err != nil {
		return fmt.Errorf("start xray: %w", err)
	}

	m.running = true
	log.Info().Int("pid", m.cmd.Process.Pid).Msg("Xray process started")

	// Monitor process in background
	go func() {
		err := m.cmd.Wait()
		m.mu.Lock()
		m.running = false
		m.mu.Unlock()
		if err != nil {
			log.Error().Err(err).Msg("Xray process exited with error")
		} else {
			log.Info().Msg("Xray process exited")
		}
	}()

	return nil
}

// Stop stops the Xray process
func (m *ProcessManager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.running || m.cmd == nil || m.cmd.Process == nil {
		return nil
	}

	log.Info().Msg("Stopping Xray process")
	if err := m.cmd.Process.Signal(syscall.SIGTERM); err != nil {
		return fmt.Errorf("send SIGTERM: %w", err)
	}

	// Wait for graceful shutdown
	done := make(chan struct{})
	go func() {
		m.cmd.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Info().Msg("Xray process stopped gracefully")
	case <-time.After(5 * time.Second):
		log.Warn().Msg("Xray process did not stop gracefully, killing")
		m.cmd.Process.Kill()
	}

	m.running = false
	return nil
}

// Restart restarts the Xray process
func (m *ProcessManager) Restart(ctx context.Context) error {
	if err := m.Stop(); err != nil {
		return err
	}
	time.Sleep(500 * time.Millisecond)
	return m.Start(ctx)
}

// IsRunning returns whether Xray is running
func (m *ProcessManager) IsRunning() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.running
}

// GetVersion returns Xray version
func (m *ProcessManager) GetVersion() string {
	cmd := exec.Command(m.binaryPath, "version")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return string(output)
}
