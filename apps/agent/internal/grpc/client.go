package grpc

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"

	pb "github.com/synexim/panel-agent/internal/grpc/proto"
)

// StreamClient manages the bidirectional gRPC stream connection
type StreamClient struct {
	conn           *grpc.ClientConn
	client         pb.AgentServiceClient
	stream         pb.AgentService_ConnectClient
	nodeID         string
	token          string
	version        string
	coreType       string
	coreVersion    string
	
	// Callbacks
	onConfig       func(config string, etag string)
	onUsersUpdate  func(added []*pb.UserConfig, removed []string)
	onKickUsers    func(emails []string, reason string)
	onRateLimit    func(email string, uploadLimit, downloadLimit int64)
	
	// State
	mu             sync.RWMutex
	connected      bool
	trafficInterval int32
	statusInterval  int32
	
	// Channels
	sendCh         chan *pb.AgentMessage
	stopCh         chan struct{}
}

// NewStreamClient creates a new gRPC stream client
func NewStreamClient(nodeID, token, version, coreType, coreVersion string) *StreamClient {
	return &StreamClient{
		nodeID:      nodeID,
		token:       token,
		version:     version,
		coreType:    coreType,
		coreVersion: coreVersion,
		sendCh:      make(chan *pb.AgentMessage, 100),
		stopCh:      make(chan struct{}),
	}
}

// SetCallbacks sets the callback functions for handling Panel messages
func (c *StreamClient) SetCallbacks(
	onConfig func(config string, etag string),
	onUsersUpdate func(added []*pb.UserConfig, removed []string),
	onKickUsers func(emails []string, reason string),
	onRateLimit func(email string, uploadLimit, downloadLimit int64),
) {
	c.onConfig = onConfig
	c.onUsersUpdate = onUsersUpdate
	c.onKickUsers = onKickUsers
	c.onRateLimit = onRateLimit
}

// Connect establishes the gRPC connection and stream
func (c *StreamClient) Connect(ctx context.Context, address string) error {
	// Create connection with keepalive
	conn, err := grpc.DialContext(ctx, address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                10 * time.Second,
			Timeout:             3 * time.Second,
			PermitWithoutStream: true,
		}),
	)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	c.conn = conn
	c.client = pb.NewAgentServiceClient(conn)

	// Create bidirectional stream
	stream, err := c.client.Connect(ctx)
	if err != nil {
		conn.Close()
		return fmt.Errorf("failed to create stream: %w", err)
	}
	c.stream = stream

	// Send register request
	if err := c.sendRegister(); err != nil {
		stream.CloseSend()
		conn.Close()
		return fmt.Errorf("failed to register: %w", err)
	}

	// Start goroutines
	go c.receiveLoop()
	go c.sendLoop()

	return nil
}

// Close closes the connection
func (c *StreamClient) Close() {
	close(c.stopCh)
	if c.stream != nil {
		c.stream.CloseSend()
	}
	if c.conn != nil {
		c.conn.Close()
	}
	c.mu.Lock()
	c.connected = false
	c.mu.Unlock()
}

// IsConnected returns the connection status
func (c *StreamClient) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.connected
}

// GetIntervals returns the configured intervals
func (c *StreamClient) GetIntervals() (traffic, status int32) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.trafficInterval, c.statusInterval
}

func (c *StreamClient) sendRegister() error {
	msg := &pb.AgentMessage{
		Payload: &pb.AgentMessage_Register{
			Register: &pb.RegisterRequest{
				NodeId:      c.nodeID,
				Token:       c.token,
				Version:     c.version,
				CoreType:    c.coreType,
				CoreVersion: c.coreVersion,
			},
		},
	}
	return c.stream.Send(msg)
}

func (c *StreamClient) receiveLoop() {
	for {
		select {
		case <-c.stopCh:
			return
		default:
		}

		msg, err := c.stream.Recv()
		if err == io.EOF {
			c.mu.Lock()
			c.connected = false
			c.mu.Unlock()
			return
		}
		if err != nil {
			c.mu.Lock()
			c.connected = false
			c.mu.Unlock()
			return
		}

		c.handleMessage(msg)
	}
}

func (c *StreamClient) sendLoop() {
	for {
		select {
		case <-c.stopCh:
			return
		case msg := <-c.sendCh:
			if err := c.stream.Send(msg); err != nil {
				// Log error but continue
				continue
			}
		}
	}
}

func (c *StreamClient) handleMessage(msg *pb.PanelMessage) {
	switch payload := msg.Payload.(type) {
	case *pb.PanelMessage_RegisterResponse:
		c.handleRegisterResponse(payload.RegisterResponse)
	case *pb.PanelMessage_Config:
		if c.onConfig != nil {
			c.onConfig(payload.Config.ConfigJson, payload.Config.Etag)
		}
	case *pb.PanelMessage_Users:
		if c.onUsersUpdate != nil {
			c.onUsersUpdate(payload.Users.Added, payload.Users.Removed)
		}
	case *pb.PanelMessage_Kick:
		if c.onKickUsers != nil {
			c.onKickUsers(payload.Kick.Emails, payload.Kick.Reason)
		}
	case *pb.PanelMessage_RateLimit:
		if c.onRateLimit != nil {
			c.onRateLimit(payload.RateLimit.Email, payload.RateLimit.UploadLimit, payload.RateLimit.DownloadLimit)
		}
	case *pb.PanelMessage_AliveResponse:
		// Heartbeat acknowledged
	}
}

func (c *StreamClient) handleRegisterResponse(resp *pb.RegisterResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if resp.Success {
		c.connected = true
		c.trafficInterval = resp.TrafficInterval
		c.statusInterval = resp.StatusInterval
	} else {
		c.connected = false
	}
}

// SendStatus sends a status report
func (c *StreamClient) SendStatus(cpuUsage, memoryUsage, diskUsage float64, uptime int64, connections int32) {
	msg := &pb.AgentMessage{
		Payload: &pb.AgentMessage_Status{
			Status: &pb.StatusReport{
				CpuUsage:    cpuUsage,
				MemoryUsage: memoryUsage,
				DiskUsage:   diskUsage,
				Uptime:      uptime,
				Connections: connections,
			},
		},
	}
	select {
	case c.sendCh <- msg:
	default:
		// Channel full, drop message
	}
}

// SendTraffic sends a traffic report
func (c *StreamClient) SendTraffic(users []UserTraffic, inbounds []InboundTraffic, outbounds []OutboundTraffic) {
	pbUsers := make([]*pb.UserTraffic, len(users))
	for i, u := range users {
		pbUsers[i] = &pb.UserTraffic{
			Email:        u.Email,
			Upload:       u.Upload,
			Download:     u.Download,
			UploadRate:   u.UploadRate,
			DownloadRate: u.DownloadRate,
		}
	}

	pbInbounds := make([]*pb.InboundTraffic, len(inbounds))
	for i, ib := range inbounds {
		pbInbounds[i] = &pb.InboundTraffic{
			Tag:      ib.Tag,
			Upload:   ib.Upload,
			Download: ib.Download,
		}
	}

	pbOutbounds := make([]*pb.OutboundTraffic, len(outbounds))
	for i, ob := range outbounds {
		pbOutbounds[i] = &pb.OutboundTraffic{
			Tag:      ob.Tag,
			Upload:   ob.Upload,
			Download: ob.Download,
		}
	}

	msg := &pb.AgentMessage{
		Payload: &pb.AgentMessage_Traffic{
			Traffic: &pb.TrafficReport{
				Users:     pbUsers,
				Inbounds:  pbInbounds,
				Outbounds: pbOutbounds,
				Timestamp: time.Now().Unix(),
			},
		},
	}
	select {
	case c.sendCh <- msg:
	default:
	}
}

// SendAlive sends a heartbeat
func (c *StreamClient) SendAlive() {
	msg := &pb.AgentMessage{
		Payload: &pb.AgentMessage_Alive{
			Alive: &pb.AliveReport{
				Timestamp: time.Now().Unix(),
			},
		},
	}
	select {
	case c.sendCh <- msg:
	default:
	}
}

// Traffic types for convenience
type UserTraffic struct {
	Email        string
	Upload       int64
	Download     int64
	UploadRate   int64
	DownloadRate int64
}

type InboundTraffic struct {
	Tag      string
	Upload   int64
	Download int64
}

type OutboundTraffic struct {
	Tag      string
	Upload   int64
	Download int64
}

// ParseConfig parses the config JSON
func ParseConfig(configJSON string) (map[string]interface{}, error) {
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return nil, err
	}
	return config, nil
}
