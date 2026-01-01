package stats

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	statsService "github.com/xtls/xray-core/app/stats/command"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// TrafficStats contains all traffic statistics
type TrafficStats struct {
	Users     []UserTraffic
	Inbounds  []InboundTraffic
	Outbounds []OutboundTraffic
	Timestamp int64
}

// UserTraffic represents per-user traffic
type UserTraffic struct {
	Email        string
	Upload       int64
	Download     int64
	UploadRate   int64
	DownloadRate int64
}

// InboundTraffic represents per-inbound traffic
type InboundTraffic struct {
	Tag      string
	Upload   int64
	Download int64
}

// OutboundTraffic represents per-outbound traffic
type OutboundTraffic struct {
	Tag      string
	Upload   int64
	Download int64
}

// Collector collects traffic statistics from proxy cores
type Collector interface {
	// QueryStats queries all traffic statistics
	QueryStats(ctx context.Context, reset bool) (*TrafficStats, error)
	// GetType returns the collector type
	GetType() string
}

// XrayCollector collects stats from Xray-core via gRPC
type XrayCollector struct {
	addr    string
	timeout time.Duration
	
	// For rate calculation
	lastStats     *TrafficStats
	lastQueryTime time.Time
}

// NewXrayCollector creates a new Xray stats collector
func NewXrayCollector(addr string) *XrayCollector {
	return &XrayCollector{
		addr:    addr,
		timeout: 10 * time.Second,
	}
}

func (c *XrayCollector) GetType() string {
	return "xray"
}

func (c *XrayCollector) dial(ctx context.Context) (*grpc.ClientConn, error) {
	dialCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	return grpc.DialContext(dialCtx, c.addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
}

// QueryStats queries all traffic statistics from Xray
func (c *XrayCollector) QueryStats(ctx context.Context, reset bool) (*TrafficStats, error) {
	conn, err := c.dial(ctx)
	if err != nil {
		return nil, fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := statsService.NewStatsServiceClient(conn)
	
	// Query all stats
	resp, err := client.QueryStats(ctx, &statsService.QueryStatsRequest{
		Pattern: "",
		Reset_:  reset,
	})
	if err != nil {
		return nil, fmt.Errorf("query stats: %w", err)
	}

	now := time.Now()
	stats := &TrafficStats{
		Users:     make([]UserTraffic, 0),
		Inbounds:  make([]InboundTraffic, 0),
		Outbounds: make([]OutboundTraffic, 0),
		Timestamp: now.Unix(),
	}

	// Parse stats
	userMap := make(map[string]*UserTraffic)
	inboundMap := make(map[string]*InboundTraffic)
	outboundMap := make(map[string]*OutboundTraffic)

	for _, stat := range resp.Stat {
		parts := strings.Split(stat.Name, ">>>")
		if len(parts) < 4 {
			continue
		}

		category := parts[0]
		name := parts[1]
		statType := parts[2]
		direction := parts[3]

		if statType != "traffic" {
			continue
		}

		switch category {
		case "user":
			if userMap[name] == nil {
				userMap[name] = &UserTraffic{Email: name}
			}
			if direction == "uplink" {
				userMap[name].Upload = stat.Value
			} else if direction == "downlink" {
				userMap[name].Download = stat.Value
			}

		case "inbound":
			if inboundMap[name] == nil {
				inboundMap[name] = &InboundTraffic{Tag: name}
			}
			if direction == "uplink" {
				inboundMap[name].Upload = stat.Value
			} else if direction == "downlink" {
				inboundMap[name].Download = stat.Value
			}

		case "outbound":
			if outboundMap[name] == nil {
				outboundMap[name] = &OutboundTraffic{Tag: name}
			}
			if direction == "uplink" {
				outboundMap[name].Upload = stat.Value
			} else if direction == "downlink" {
				outboundMap[name].Download = stat.Value
			}
		}
	}

	// Calculate rates if we have previous stats
	if c.lastStats != nil && !c.lastQueryTime.IsZero() {
		elapsed := now.Sub(c.lastQueryTime).Seconds()
		if elapsed > 0 {
			c.calculateUserRates(userMap, elapsed)
		}
	}

	// Convert maps to slices
	for _, u := range userMap {
		if u.Upload > 0 || u.Download > 0 {
			stats.Users = append(stats.Users, *u)
		}
	}
	for _, ib := range inboundMap {
		if ib.Upload > 0 || ib.Download > 0 {
			stats.Inbounds = append(stats.Inbounds, *ib)
		}
	}
	for _, ob := range outboundMap {
		if ob.Upload > 0 || ob.Download > 0 {
			stats.Outbounds = append(stats.Outbounds, *ob)
		}
	}

	// Store for rate calculation
	c.lastStats = stats
	c.lastQueryTime = now

	log.Debug().
		Int("users", len(stats.Users)).
		Int("inbounds", len(stats.Inbounds)).
		Int("outbounds", len(stats.Outbounds)).
		Msg("Collected Xray stats")

	return stats, nil
}

func (c *XrayCollector) calculateUserRates(userMap map[string]*UserTraffic, elapsed float64) {
	if c.lastStats == nil {
		return
	}
	
	lastUserMap := make(map[string]*UserTraffic)
	for i := range c.lastStats.Users {
		u := &c.lastStats.Users[i]
		lastUserMap[u.Email] = u
	}

	for email, current := range userMap {
		if last, ok := lastUserMap[email]; ok {
			uploadDiff := current.Upload - last.Upload
			downloadDiff := current.Download - last.Download
			if uploadDiff > 0 {
				current.UploadRate = int64(float64(uploadDiff) / elapsed)
			}
			if downloadDiff > 0 {
				current.DownloadRate = int64(float64(downloadDiff) / elapsed)
			}
		}
	}
}
