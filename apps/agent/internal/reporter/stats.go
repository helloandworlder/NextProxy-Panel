package reporter

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/synexim/panel-agent/pkg/types"
)

// StatsCollector collects system and Xray stats
type StatsCollector struct {
	xrayAPIAddr string
	startTime   time.Time
}

// NewStatsCollector creates a new stats collector
func NewStatsCollector(xrayAPIAddr string) *StatsCollector {
	return &StatsCollector{
		xrayAPIAddr: xrayAPIAddr,
		startTime:   time.Now(),
	}
}

// CollectStatus collects node status
func (c *StatsCollector) CollectStatus(xrayVersion string) *types.StatusReport {
	return &types.StatusReport{
		CPUUsage:    c.getCPUUsage(),
		MemoryUsage: c.getMemoryUsage(),
		DiskUsage:   c.getDiskUsage(),
		Uptime:      int64(time.Since(c.startTime).Seconds()),
		OnlineUsers: 0, // Will be updated from Xray stats
		XrayVersion: xrayVersion,
	}
}

// CollectTraffic collects traffic stats from Xray API
func (c *StatsCollector) CollectTraffic() ([]types.TrafficReport, error) {
	conn, err := net.Dial("tcp", c.xrayAPIAddr)
	if err != nil {
		return nil, fmt.Errorf("connect to xray api: %w", err)
	}
	defer conn.Close()

	// Query stats via gRPC (simplified - in production use proper gRPC client)
	// For now, return empty - will implement full gRPC client later
	return []types.TrafficReport{}, nil
}

func (c *StatsCollector) getCPUUsage() float64 {
	if runtime.GOOS != "linux" {
		return 0
	}

	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0
	}

	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return 0
	}

	fields := strings.Fields(lines[0])
	if len(fields) < 5 {
		return 0
	}

	var total, idle int64
	for i := 1; i < len(fields); i++ {
		val, _ := strconv.ParseInt(fields[i], 10, 64)
		total += val
		if i == 4 {
			idle = val
		}
	}

	if total == 0 {
		return 0
	}
	return float64(total-idle) / float64(total) * 100
}

func (c *StatsCollector) getMemoryUsage() float64 {
	if runtime.GOOS != "linux" {
		return 0
	}

	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0
	}
	defer file.Close()

	var total, available int64
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		val, _ := strconv.ParseInt(fields[1], 10, 64)
		switch fields[0] {
		case "MemTotal:":
			total = val
		case "MemAvailable:":
			available = val
		}
	}

	if total == 0 {
		return 0
	}
	return float64(total-available) / float64(total) * 100
}

func (c *StatsCollector) getDiskUsage() float64 {
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		return 0
	}

	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	if total == 0 {
		return 0
	}
	return float64(total-free) / float64(total) * 100
}
