package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/internal/di"
)

var (
	configPath = flag.String("config", "", "Path to config file (optional, uses env vars if not set)")
	version    = "dev"
)

func main() {
	flag.Parse()

	// Setup logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Str("version", version).Msg("Panel Agent starting")

	// Initialize manager with Wire DI
	mgr, err := di.InitializeManager(*configPath)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize agent")
	}

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start manager
	if err := mgr.Start(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to start agent")
	}

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Info().Msg("Shutdown signal received")
	cancel()
	mgr.Stop()
	log.Info().Msg("Panel Agent stopped")
}
