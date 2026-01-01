# Panel Agent

Go sidecar for Panel - manages Xray-core on proxy nodes.

## Features

- Pulls configuration from Panel API (with ETag caching)
- Syncs users and injects into Xray inbounds
- Reports traffic, status, and online users
- Manages Xray process lifecycle

## Build

```bash
go build -o panel-agent ./cmd/agent
```

## Usage

```bash
./panel-agent -config /etc/panel-agent/config.yaml
```

## Configuration

See `config.example.yaml` for all options.

## Directory Structure

```
apps/agent/
├── cmd/agent/          # Main entry point
├── internal/
│   ├── config/         # Configuration parsing
│   ├── client/         # Panel API client
│   ├── xray/           # Xray config generator & process manager
│   ├── reporter/       # Stats collection
│   └── manager/        # Main orchestrator
└── pkg/types/          # Shared types
```
