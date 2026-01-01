package xray

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	handlerService "github.com/xtls/xray-core/app/proxyman/command"
	statsService "github.com/xtls/xray-core/app/stats/command"
	"github.com/xtls/xray-core/common/protocol"
	"github.com/xtls/xray-core/common/serial"
	"github.com/xtls/xray-core/common/uuid"
	"github.com/xtls/xray-core/proxy/shadowsocks"
	"github.com/xtls/xray-core/proxy/trojan"
	"github.com/xtls/xray-core/proxy/vless"
	"github.com/xtls/xray-core/proxy/vmess"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/synexim/panel-agent/pkg/types"
)

// GRPCClient provides access to Xray's gRPC API
type GRPCClient struct {
	addr    string
	timeout time.Duration
}

// NewGRPCClient creates a new Xray gRPC client
func NewGRPCClient(addr string) *GRPCClient {
	return &GRPCClient{
		addr:    addr,
		timeout: 10 * time.Second,
	}
}

// dial creates a gRPC connection
func (c *GRPCClient) dial(ctx context.Context) (*grpc.ClientConn, error) {
	dialCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	return grpc.DialContext(dialCtx, c.addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
}

// ========================================
// Stats Service - Traffic & Online Users
// ========================================

// OnlineIPInfo represents online IP information for a user
type OnlineIPInfo struct {
	Email string
	IPs   map[string]int64 // IP -> timestamp
}

// QueryTrafficStats queries traffic statistics for all users
// Returns upload/download bytes per user (with reset option to clear after read)
func (c *GRPCClient) QueryTrafficStats(ctx context.Context, reset bool) ([]types.TrafficReport, error) {
	conn, err := c.dial(ctx)
	if err != nil {
		return nil, fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := statsService.NewStatsServiceClient(conn)
	resp, err := client.QueryStats(ctx, &statsService.QueryStatsRequest{
		Pattern: "user>>>",
		Reset_:  reset,
	})
	if err != nil {
		return nil, fmt.Errorf("query stats: %w", err)
	}

	// Parse stats: user>>>email>>>traffic>>>uplink/downlink
	trafficMap := make(map[string]*types.TrafficReport)
	for _, stat := range resp.Stat {
		parts := strings.Split(stat.Name, ">>>")
		if len(parts) != 4 || parts[0] != "user" || parts[2] != "traffic" {
			continue
		}
		email := parts[1]
		direction := parts[3]

		if _, ok := trafficMap[email]; !ok {
			trafficMap[email] = &types.TrafficReport{Email: email}
		}
		switch direction {
		case "uplink":
			trafficMap[email].Upload = stat.Value
		case "downlink":
			trafficMap[email].Download = stat.Value
		}
	}

	reports := make([]types.TrafficReport, 0, len(trafficMap))
	for _, r := range trafficMap {
		if r.Upload > 0 || r.Download > 0 {
			reports = append(reports, *r)
		}
	}
	return reports, nil
}

// GetUserOnlineCount gets the online session count for a user
// Note: Uses QueryStats as GetStatsOnline is not available in xray-core v1.8.x
func (c *GRPCClient) GetUserOnlineCount(ctx context.Context, email string) (int64, error) {
	conn, err := c.dial(ctx)
	if err != nil {
		return 0, fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := statsService.NewStatsServiceClient(conn)
	pattern := fmt.Sprintf("user>>>%s>>>online", email)
	resp, err := client.QueryStats(ctx, &statsService.QueryStatsRequest{
		Pattern: pattern,
		Reset_:  false,
	})
	if err != nil {
		return 0, fmt.Errorf("query stats online: %w", err)
	}
	for _, stat := range resp.Stat {
		if strings.Contains(stat.Name, "online") {
			return stat.Value, nil
		}
	}
	return 0, nil
}

// GetUserOnlineIPs gets the online IP addresses for a user
// Note: xray-core v1.8.x doesn't have GetStatsOnlineIpList, return empty for now
// Online IP tracking will be handled by Panel based on connection logs
func (c *GRPCClient) GetUserOnlineIPs(ctx context.Context, email string) (*OnlineIPInfo, error) {
	// xray-core v1.8.x doesn't support GetStatsOnlineIpList
	// Return empty IPs - online tracking handled differently
	return &OnlineIPInfo{
		Email: email,
		IPs:   make(map[string]int64),
	}, nil
}

// GetAllOnlineUsers queries all online users and their IPs
func (c *GRPCClient) GetAllOnlineUsers(ctx context.Context, emails []string) ([]types.AliveUser, error) {
	var aliveUsers []types.AliveUser

	for _, email := range emails {
		info, err := c.GetUserOnlineIPs(ctx, email)
		if err != nil {
			continue // Skip users with errors
		}
		for ip := range info.IPs {
			aliveUsers = append(aliveUsers, types.AliveUser{
				Email: email,
				IP:    ip,
			})
		}
	}
	return aliveUsers, nil
}

// ========================================
// Handler Service - User Management
// ========================================

// AddUser adds a user to an inbound (hot reload, no restart needed)
func (c *GRPCClient) AddUser(ctx context.Context, inboundTag string, user *types.UserConfig) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := handlerService.NewHandlerServiceClient(conn)
	protoUser, err := c.buildProtocolUser(user)
	if err != nil {
		return fmt.Errorf("build protocol user: %w", err)
	}

	_, err = client.AlterInbound(ctx, &handlerService.AlterInboundRequest{
		Tag:       inboundTag,
		Operation: serial.ToTypedMessage(&handlerService.AddUserOperation{User: protoUser}),
	})
	if err != nil {
		return fmt.Errorf("alter inbound add user: %w", err)
	}
	log.Debug().Str("email", user.Email).Str("inbound", inboundTag).Msg("User added to inbound")
	return nil
}

// RemoveUser removes a user from an inbound (kick user)
func (c *GRPCClient) RemoveUser(ctx context.Context, inboundTag string, email string) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := handlerService.NewHandlerServiceClient(conn)
	_, err = client.AlterInbound(ctx, &handlerService.AlterInboundRequest{
		Tag:       inboundTag,
		Operation: serial.ToTypedMessage(&handlerService.RemoveUserOperation{Email: email}),
	})
	if err != nil {
		return fmt.Errorf("alter inbound remove user: %w", err)
	}
	log.Debug().Str("email", email).Str("inbound", inboundTag).Msg("User removed from inbound")
	return nil
}

// RemoveUserFromAllInbounds removes a user from all specified inbounds
func (c *GRPCClient) RemoveUserFromAllInbounds(ctx context.Context, email string, inboundTags []string) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := handlerService.NewHandlerServiceClient(conn)
	for _, tag := range inboundTags {
		_, err := client.AlterInbound(ctx, &handlerService.AlterInboundRequest{
			Tag:       tag,
			Operation: serial.ToTypedMessage(&handlerService.RemoveUserOperation{Email: email}),
		})
		if err != nil {
			log.Debug().Err(err).Str("email", email).Str("inbound", tag).Msg("Failed to remove user (may not exist)")
			continue
		}
	}
	return nil
}

// SyncUsers synchronizes users with Xray (add new, remove old) without restart
func (c *GRPCClient) SyncUsers(ctx context.Context, inboundTag string, currentEmails []string, newUsers []*types.UserConfig) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := handlerService.NewHandlerServiceClient(conn)
	
	// Build maps for comparison
	currentSet := make(map[string]bool)
	for _, email := range currentEmails {
		currentSet[email] = true
	}
	newUserMap := make(map[string]*types.UserConfig)
	for _, u := range newUsers {
		newUserMap[u.Email] = u
	}

	// Remove users not in new list
	for email := range currentSet {
		if _, exists := newUserMap[email]; !exists {
			client.AlterInbound(ctx, &handlerService.AlterInboundRequest{
				Tag:       inboundTag,
				Operation: serial.ToTypedMessage(&handlerService.RemoveUserOperation{Email: email}),
			})
			log.Debug().Str("email", email).Str("inbound", inboundTag).Msg("User removed during sync")
		}
	}

	// Add users not in current list
	for email, user := range newUserMap {
		if !currentSet[email] {
			protoUser, err := c.buildProtocolUser(user)
			if err != nil {
				log.Warn().Err(err).Str("email", email).Msg("Failed to build user")
				continue
			}
			client.AlterInbound(ctx, &handlerService.AlterInboundRequest{
				Tag:       inboundTag,
				Operation: serial.ToTypedMessage(&handlerService.AddUserOperation{User: protoUser}),
			})
			log.Debug().Str("email", email).Str("inbound", inboundTag).Msg("User added during sync")
		}
	}

	return nil
}

// ========================================
// Helper Methods
// ========================================

// buildProtocolUser builds a protocol.User from UserConfig
func (c *GRPCClient) buildProtocolUser(user *types.UserConfig) (*protocol.User, error) {
	protoUser := &protocol.User{
		Level: uint32(user.Level),
		Email: user.Email,
	}

	// Determine protocol by available credentials and build account
	if user.UUID != "" {
		uid, err := uuid.ParseString(user.UUID)
		if err != nil {
			return nil, fmt.Errorf("parse uuid: %w", err)
		}

		if user.Flow != "" {
			// VLESS account
			protoUser.Account = serial.ToTypedMessage(&vless.Account{
				Id:   uid.String(),
				Flow: user.Flow,
			})
		} else {
			// VMess account (AlterId deprecated in xray-core, use SecuritySettings)
			protoUser.Account = serial.ToTypedMessage(&vmess.Account{
				Id: uid.String(),
				// Note: AlterId is deprecated in xray-core v1.8.x
			})
		}
		return protoUser, nil
	}

	if user.Password != "" {
		if user.Method != "" {
			// Shadowsocks account
			cipherType := shadowsocks.CipherType_AES_256_GCM
			switch user.Method {
			case "aes-128-gcm":
				cipherType = shadowsocks.CipherType_AES_128_GCM
			case "chacha20-poly1305", "chacha20-ietf-poly1305":
				cipherType = shadowsocks.CipherType_CHACHA20_POLY1305
			case "none":
				cipherType = shadowsocks.CipherType_NONE
			}
			protoUser.Account = serial.ToTypedMessage(&shadowsocks.Account{
				Password:   user.Password,
				CipherType: cipherType,
			})
		} else {
			// Trojan account
			protoUser.Account = serial.ToTypedMessage(&trojan.Account{
				Password: user.Password,
			})
		}
		return protoUser, nil
	}

	return nil, fmt.Errorf("cannot determine protocol for user %s: no uuid or password", user.Email)
}

// KickUser kicks a user from all inbounds (convenience method)
func (c *GRPCClient) KickUser(ctx context.Context, email string, inboundTags []string) error {
	return c.RemoveUserFromAllInbounds(ctx, email, inboundTags)
}

// ========================================
// Rate Limiting Service
// ========================================

// SetUserRateLimit sets rate limit for a specific user by email
func (c *GRPCClient) SetUserRateLimit(ctx context.Context, email string, uplinkBytesPerSec, downlinkBytesPerSec int64) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := handlerService.NewHandlerServiceClient(conn)
	_, err = client.SetUserRateLimit(ctx, &handlerService.SetUserRateLimitRequest{
		Email:    email,
		Uplink:   uplinkBytesPerSec,
		Downlink: downlinkBytesPerSec,
	})
	if err != nil {
		return fmt.Errorf("set user rate limit: %w", err)
	}
	log.Debug().Str("email", email).Int64("uplink", uplinkBytesPerSec).Int64("downlink", downlinkBytesPerSec).Msg("User rate limit set")
	return nil
}

// RemoveUserRateLimit removes rate limit for a specific user
func (c *GRPCClient) RemoveUserRateLimit(ctx context.Context, email string) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return fmt.Errorf("dial xray api: %w", err)
	}
	defer conn.Close()

	client := handlerService.NewHandlerServiceClient(conn)
	_, err = client.RemoveUserRateLimit(ctx, &handlerService.RemoveUserRateLimitRequest{
		Email: email,
	})
	if err != nil {
		return fmt.Errorf("remove user rate limit: %w", err)
	}
	log.Debug().Str("email", email).Msg("User rate limit removed")
	return nil
}

// SyncUserRateLimits synchronizes rate limits for all users
func (c *GRPCClient) SyncUserRateLimits(ctx context.Context, rateLimits []types.RateLimitConfig) error {
	for _, rl := range rateLimits {
		if rl.UploadBytesPerSec > 0 || rl.DownloadBytesPerSec > 0 {
			if err := c.SetUserRateLimit(ctx, rl.Email, rl.UploadBytesPerSec, rl.DownloadBytesPerSec); err != nil {
				log.Warn().Err(err).Str("email", rl.Email).Msg("Failed to set user rate limit")
			}
		}
	}
	return nil
}
